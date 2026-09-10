import { CliAgentAdapter } from "./runtime-adapter";
export class HermesAdapter extends CliAgentAdapter { constructor(executable = process.env.HERMES_EXECUTABLE ?? "hermes", runner?: ConstructorParameters<typeof CliAgentAdapter>[2]) { super("hermes", executable, runner); } }
