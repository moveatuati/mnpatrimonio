import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { OperationDashboard } from "./OperationDashboard";
import { buildDashboard } from "@/domain/dashboard";
import { countMonthlyLateArrivals } from "@/domain/rules/late-history";

const CONSULTED_DATE = "2026-10-20";
const consulted = buildDashboard(CONSULTED_DATE);

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(cleanup);

function selectDate(value = CONSULTED_DATE) {
  fireEvent.change(screen.getByLabelText("Data de referência"), { target: { value } });
}

function search(value: string) {
  fireEvent.change(
    screen.getByRole("searchbox", { name: "Buscar colaborador por nome ou matrícula" }),
    {
      target: { value },
    },
  );
}

function selectStatus(value: string) {
  fireEvent.change(screen.getByRole("combobox", { name: "Filtrar por situação" }), {
    target: { value },
  });
}

function tableIds() {
  return within(screen.getByRole("table"))
    .queryAllByText(/^FM-\d{3}$/)
    .map((element) => element.textContent);
}

describe("Consulta de entradas da página inicial", () => {
  it.each([
    { card: "Escalados no dia", status: "all", expected: consulted.arrivals },
    {
      card: "Entradas registradas",
      status: "registered",
      expected: consulted.arrivals.filter((arrival) => arrival.entry),
    },
    {
      card: "Acima do alerta",
      status: "atraso_acima",
      expected: consulted.arrivals.filter((arrival) => arrival.status === "atraso_acima"),
    },
    {
      card: "Sem entrada registrada",
      status: "sem_registro",
      expected: consulted.arrivals.filter((arrival) => arrival.status === "sem_registro"),
    },
  ])(
    "o cartão $card abre seus registros e preserva a data consultada",
    ({ card, status, expected }) => {
      render(<OperationDashboard />);
      selectDate();
      fireEvent.click(screen.getByRole("button", { name: "Grupo A" }));
      search("nome inexistente");
      selectStatus("no_horario");

      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${card}:`) }));

      expect(screen.getByLabelText("Data de referência")).toHaveValue(CONSULTED_DATE);
      expect(screen.getByRole("button", { name: "Todos os grupos" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("searchbox")).toHaveValue("");
      expect(screen.getByRole("combobox")).toHaveValue(status);
      expect(tableIds()).toEqual(expected.map((arrival) => arrival.employee.id));
      expect(screen.getByRole("status")).toHaveTextContent(`${expected.length} colaborador`);
      expect(screen.getByRole("heading", { name: "Consulta de entradas" })).toHaveFocus();
    },
  );

  it("combina o grupo selecionado com a busca de nome sem acentos", () => {
    render(<OperationDashboard />);
    selectDate();
    fireEvent.click(screen.getByRole("button", { name: "Grupo B" }));
    search("  JOAO  ");

    const expected = consulted.arrivals.filter(
      (arrival) => arrival.employee.group === "B" && arrival.employee.name.includes("João"),
    );
    expect(expected.length).toBeGreaterThan(0);
    expect(tableIds()).toEqual(expected.map((arrival) => arrival.employee.id));
    expect(screen.getByRole("status")).toHaveTextContent(`${expected.length} colaborador`);
    expect(screen.getByRole("button", { name: "Grupo B" })).toHaveAttribute("aria-pressed", "true");
  });

  it("limpa a consulta vazia sem voltar à data inicial", () => {
    render(<OperationDashboard />);
    selectDate();
    fireEvent.click(screen.getByRole("button", { name: "Grupo C" }));
    selectStatus("sem_registro");
    search("matrícula inexistente");
    expect(
      screen.getByRole("heading", { name: "Nenhum registro nesta consulta" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Limpar filtros" })[0]!);

    expect(screen.getByLabelText("Data de referência")).toHaveValue(CONSULTED_DATE);
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("combobox")).toHaveValue("all");
    expect(tableIds()).toEqual(consulted.arrivals.map((arrival) => arrival.employee.id));
    expect(
      screen.queryByRole("heading", { name: "Nenhum registro nesta consulta" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("1–8 de 63")).toBeInTheDocument();
  });

  it.each(["", "1999-12-31", "2026-02-30"])(
    "mantém os dados da última data válida quando o campo recebe %s",
    (invalidDate) => {
      render(<OperationDashboard />);
      selectDate();
      const previousIds = tableIds();
      const previousCards = screen
        .getAllByRole("button", { name: /Consultar registros$/ })
        .map((card) => card.getAttribute("aria-label"));

      selectDate(invalidDate);

      expect(screen.getByLabelText("Data de referência")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("alert")).toHaveTextContent("O painel mantém 20 de outubro de 2026");
      expect(tableIds()).toEqual(previousIds);
      expect(
        screen
          .getAllByRole("button", { name: /Consultar registros$/ })
          .map((card) => card.getAttribute("aria-label")),
      ).toEqual(previousCards);
      expect(screen.getByRole("table")).toHaveAccessibleName(/20 de outubro de 2026/);
    },
  );

  it("volta à primeira página ao alterar grupo, busca, situação ou data", () => {
    render(<OperationDashboard />);
    const next = () => fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
    const previous = () => screen.getByRole("button", { name: "Página anterior" });
    next();
    expect(screen.getByText("9–16 de 63")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Grupo B" }));
    expect(screen.getByText("1–8 de 29")).toBeInTheDocument();
    expect(previous()).toBeDisabled();
    next();
    search("FM-005");
    expect(screen.getByText("1–1 de 1")).toBeInTheDocument();
    expect(previous()).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    next();
    selectStatus("registered");
    expect(previous()).toBeDisabled();
    next();
    selectDate();
    expect(previous()).toBeDisabled();
    expect(screen.getByText(`1–8 de ${consulted.kpis.entries}`)).toBeInTheDocument();
  });

  it("exibe no diálogo os horários e o histórico do colaborador na data consultada", () => {
    render(<OperationDashboard />);
    selectDate();
    const arrival = consulted.arrivals.find((item) => item.entry)!;
    search(arrival.employee.id);
    fireEvent.click(
      screen.getByRole("button", { name: `Ver detalhes de ${arrival.employee.name}` }),
    );

    const dialog = screen.getByRole("dialog", { name: arrival.employee.name });
    const dialogContent = within(dialog);
    const history = countMonthlyLateArrivals(
      CONSULTED_DATE,
      consulted.arrivals.map((item) => item.employee),
    );
    expect(dialog).toHaveTextContent(`${arrival.employee.id} · Grupo ${arrival.employee.group}`);
    expect(dialog).toHaveTextContent("20 de outubro de 2026 · Registro fictício");
    expect(dialogContent.getByText("Entrada prevista").parentElement).toHaveTextContent(
      arrival.planned,
    );
    expect(dialogContent.getByText("Entrada registrada").parentElement).toHaveTextContent(
      arrival.entry!,
    );
    expect(
      dialogContent.getByText("Atrasos acima de 10 min no mês").parentElement,
    ).toHaveTextContent(String(history[arrival.employee.id]));
    expect(dialog).toHaveTextContent("Histórico de 01/10 até 20/10/2026");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Data de referência")).toHaveValue(CONSULTED_DATE);
    expect(screen.getByRole("searchbox")).toHaveValue(arrival.employee.id);
  });
});
