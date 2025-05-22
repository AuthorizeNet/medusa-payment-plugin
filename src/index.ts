import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import { AuthorizenetProviderService } from "./services";

const services = [AuthorizenetProviderService];

export default ModuleProvider(Modules.PAYMENT, {
    services
});
