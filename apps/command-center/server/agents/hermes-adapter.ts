import { CliAgentAdapter } from "./runtime-adapter";
export class HermesAdapter extends CliAgentAdapter { constructor(executable?: string, runner?: ConstructorParameters<typeof CliAgentAdapter>[2]) { super("hermes", executable, runner); } }
