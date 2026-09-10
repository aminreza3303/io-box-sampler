import { CliAgentAdapter } from "./runtime-adapter";
export class OmpAdapter extends CliAgentAdapter { constructor(executable = process.env.OMP_EXECUTABLE, runner?: ConstructorParameters<typeof CliAgentAdapter>[2]) { super("omp", executable, runner); } }
