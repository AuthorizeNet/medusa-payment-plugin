import { ProviderWebhookPayload, WebhookActionResult } from "@medusajs/types";
import AuthorizenetBase from "../core/authorizenet-base";
import { PaymentIntentOptions, PaymentProviderKeys } from "../types";

class AuthorizenetProviderService extends AuthorizenetBase {
    getWebhookActionAndData(data: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
        throw new Error("Method not implemented.");
    }
    static identifier = PaymentProviderKeys.AUTHORIZENET;

    constructor(_, options) {
        super(_, options);
    }

    get paymentIntentOptions(): PaymentIntentOptions {
        return {} as any;
    }
}

export default AuthorizenetProviderService;
