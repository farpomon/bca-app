declare module 'javascript-lp-solver' {
  interface LPModel {
    optimize: string;
    opType: 'max' | 'min';
    constraints: Record<string, any>;
    variables: Record<string, Record<string, number>>;
    ints?: Record<string, number>;
    binaries?: Record<string, number>;
  }

  interface LPSolution {
    feasible: boolean;
    result: number;
    [key: string]: any;
  }

  function Solve(model: LPModel): LPSolution;

  export default { Solve };
}
