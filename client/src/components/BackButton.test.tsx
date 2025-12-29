import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BackButton } from "./BackButton";
import { useLocation, useSearch } from "wouter";

// Mock wouter
vi.mock("wouter", () => ({
  useLocation: vi.fn(),
  useSearch: vi.fn(),
}));

describe("BackButton", () => {
  const mockSetLocation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useLocation as any).mockReturnValue(["/", mockSetLocation]);
    (useSearch as any).mockReturnValue("");
  });

  describe("basic navigation", () => {
    it("renders with default label when to is 'back'", () => {
      render(<BackButton to="back" />);
      expect(screen.getByText("Back")).toBeInTheDocument();
    });

    it("renders with custom label", () => {
      render(<BackButton to="back" label="Go Back" />);
      expect(screen.getByText("Go Back")).toBeInTheDocument();
    });

    it("renders dashboard label when to is 'dashboard'", () => {
      render(<BackButton to="dashboard" />);
      expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
    });

    it("calls window.history.back when to is 'back'", () => {
      const backSpy = vi.spyOn(window.history, "back");
      render(<BackButton to="back" />);
      
      const button = screen.getByText("Back");
      fireEvent.click(button);
      
      expect(backSpy).toHaveBeenCalled();
      backSpy.mockRestore();
    });

    it("navigates to specific path when to is a string", () => {
      render(<BackButton to="/projects/123" />);
      
      const button = screen.getByText("Back");
      fireEvent.click(button);
      
      expect(mockSetLocation).toHaveBeenCalledWith("/projects/123");
    });
  });

  describe("filter persistence", () => {
    it("preserves search filter when navigating to dashboard", () => {
      (useSearch as any).mockReturnValue("?search=test");
      
      render(<BackButton to="dashboard" preserveFilters={true} />);
      
      const button = screen.getByText("Back to Dashboard");
      fireEvent.click(button);
      
      expect(mockSetLocation).toHaveBeenCalledWith("/?search=test");
    });

    it("preserves status filter when navigating to dashboard", () => {
      (useSearch as any).mockReturnValue("?status=active");
      
      render(<BackButton to="dashboard" preserveFilters={true} />);
      
      const button = screen.getByText("Back to Dashboard");
      fireEvent.click(button);
      
      expect(mockSetLocation).toHaveBeenCalledWith("/?status=active");
    });

    it("preserves multiple filters when navigating to dashboard", () => {
      (useSearch as any).mockReturnValue("?search=test&status=active&dateStart=2024-01-01");
      
      render(<BackButton to="dashboard" preserveFilters={true} />);
      
      const button = screen.getByText("Back to Dashboard");
      fireEvent.click(button);
      
      // Should preserve all three filters
      const callArg = mockSetLocation.mock.calls[0][0];
      expect(callArg).toContain("search=test");
      expect(callArg).toContain("status=active");
      expect(callArg).toContain("dateStart=2024-01-01");
    });

    it("does not preserve filters when preserveFilters is false", () => {
      (useSearch as any).mockReturnValue("?search=test&status=active");
      
      render(<BackButton to="dashboard" preserveFilters={false} />);
      
      const button = screen.getByText("Back to Dashboard");
      fireEvent.click(button);
      
      expect(mockSetLocation).toHaveBeenCalledWith("/");
    });

    it("preserves only supported filter keys", () => {
      (useSearch as any).mockReturnValue("?search=test&unsupported=value&status=active");
      
      render(<BackButton to="dashboard" preserveFilters={true} />);
      
      const button = screen.getByText("Back to Dashboard");
      fireEvent.click(button);
      
      const callArg = mockSetLocation.mock.calls[0][0];
      expect(callArg).toContain("search=test");
      expect(callArg).toContain("status=active");
      expect(callArg).not.toContain("unsupported=value");
    });

    it("handles empty search string correctly", () => {
      (useSearch as any).mockReturnValue("");
      
      render(<BackButton to="dashboard" preserveFilters={true} />);
      
      const button = screen.getByText("Back to Dashboard");
      fireEvent.click(button);
      
      expect(mockSetLocation).toHaveBeenCalledWith("/");
    });

    it("preserves dateEnd filter", () => {
      (useSearch as any).mockReturnValue("?dateStart=2024-01-01&dateEnd=2024-12-31");
      
      render(<BackButton to="dashboard" preserveFilters={true} />);
      
      const button = screen.getByText("Back to Dashboard");
      fireEvent.click(button);
      
      const callArg = mockSetLocation.mock.calls[0][0];
      expect(callArg).toContain("dateStart=2024-01-01");
      expect(callArg).toContain("dateEnd=2024-12-31");
    });

    it("preserves type and priority filters", () => {
      (useSearch as any).mockReturnValue("?type=building&priority=high");
      
      render(<BackButton to="dashboard" preserveFilters={true} />);
      
      const button = screen.getByText("Back to Dashboard");
      fireEvent.click(button);
      
      const callArg = mockSetLocation.mock.calls[0][0];
      expect(callArg).toContain("type=building");
      expect(callArg).toContain("priority=high");
    });

    it("preserves condition filter", () => {
      (useSearch as any).mockReturnValue("?condition=poor");
      
      render(<BackButton to="dashboard" preserveFilters={true} />);
      
      const button = screen.getByText("Back to Dashboard");
      fireEvent.click(button);
      
      expect(mockSetLocation).toHaveBeenCalledWith("/?condition=poor");
    });
  });

  describe("default behavior", () => {
    it("preserves filters by default when to is 'dashboard'", () => {
      (useSearch as any).mockReturnValue("?search=test");
      
      render(<BackButton to="dashboard" />);
      
      const button = screen.getByText("Back to Dashboard");
      fireEvent.click(button);
      
      expect(mockSetLocation).toHaveBeenCalledWith("/?search=test");
    });

    it("does not preserve filters when to is 'back'", () => {
      (useSearch as any).mockReturnValue("?search=test");
      const backSpy = vi.spyOn(window.history, "back");
      
      render(<BackButton to="back" />);
      
      const button = screen.getByText("Back");
      fireEvent.click(button);
      
      expect(backSpy).toHaveBeenCalled();
      expect(mockSetLocation).not.toHaveBeenCalled();
      backSpy.mockRestore();
    });
  });

  describe("CSS classes", () => {
    it("applies custom className", () => {
      render(<BackButton to="back" className="custom-class" />);
      
      const button = screen.getByText("Back");
      expect(button).toHaveClass("custom-class");
    });

    it("applies default classes", () => {
      render(<BackButton to="back" />);
      
      const button = screen.getByText("Back");
      expect(button).toHaveClass("mb-4");
      expect(button).toHaveClass("-ml-2");
    });
  });
});
