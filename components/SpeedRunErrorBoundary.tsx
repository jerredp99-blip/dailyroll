"use client";

import React, { Component, type ReactNode } from "react";
import { AlertCircle, X, RotateCcw } from "lucide-react";

interface SpeedRunErrorBoundaryProps {
  children: ReactNode;
  onClose?: () => void;
}

interface SpeedRunErrorBoundaryState {
  hasError: boolean;
  error?: Error | null;
}

export class SpeedRunErrorBoundary extends Component<
  SpeedRunErrorBoundaryProps,
  SpeedRunErrorBoundaryState
> {
  constructor(props: SpeedRunErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SpeedRunErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[SpeedRun Error Boundary Caught]:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md text-[#e6eee5]"
        >
          <div className="w-full max-w-md rounded-3xl border border-red-800/60 bg-[#120e0e] p-6 shadow-2xl text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-950/80 border border-red-600/40 text-red-400 mb-3.5 shadow-lg">
              <AlertCircle size={24} />
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight">
              Speed Run Encountered an Issue
            </h3>
            <p className="mt-1.5 text-xs text-[#b59999] leading-relaxed">
              {this.state.error?.message ||
                "A client runtime exception occurred during this session. Your tracker data is safe."}
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center gap-1.5 rounded-xl border border-red-900/50 bg-[#251616] px-4 py-2 text-xs font-bold text-red-200 hover:bg-[#341d1d] hover:text-white transition active:scale-95"
              >
                <RotateCcw size={13} />
                <span>Reset & Close</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-[#39ff6a] px-5 py-2 text-xs font-bold text-[#0d1712] shadow-md hover:scale-102 active:scale-95 transition"
              >
                <X size={13} />
                <span>Return to Tracker</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

