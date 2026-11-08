import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FinanceApp } from "./FinanceApp";
vi.mock("recharts", () => ({
  ResponsiveContainer: ({children}:{children:React.ReactNode}) => <div>{children}</div>,
  BarChart: ({children}:{children:React.ReactNode}) => <div>{children}</div>,
  Bar: () => null, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null,
  Tooltip: () => null
}));
describe("public demo dashboard", () => {
  it("labels itself as demo and shows only synthetic values", () => {
    render(<FinanceApp />);
    expect(screen.getByText("Visão geral das finanças")).toBeInTheDocument();
    expect(screen.getByText(/MODO DEMONSTRAÇÃO/)).toBeInTheDocument();
    expect(screen.getByText(/dados são sintéticos/)).toBeInTheDocument();
  });
});
