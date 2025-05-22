import { Logger } from "@medusajs/medusa";
import {
  Options,
  AuthorizenetOptions,
  AuthorizenetProviderConfig,
  Shipping,
} from "../types";

import {
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  PaymentProviderOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
} from "@medusajs/types";
import {
  AbstractPaymentProvider,
  isDefined,
  MedusaError,
  MedusaErrorCodes,
  MedusaErrorTypes,
  PaymentSessionStatus,
} from "@medusajs/framework/utils";
import { PaymentIntentOptions } from "../types";
import { APIContracts, APIControllers } from "authorizenet";
import { BigNumberRawValue } from "@medusajs/framework/types";

abstract class AuthorizenetBase extends AbstractPaymentProvider {
  static identifier = "authorizenet";

  protected readonly options_: AuthorizenetProviderConfig & Options;

  logger: Logger;
  container_: any;
  solutionID: any;

  protected constructor(container: any, options) {
    super(container, options);

    this.options_ = options;
    this.logger = container.logger as Logger;
    this.container_ = container;
    this.solutionID =
      this.options_.enviornment === "production" ? "AAA201051" : "AAA198606";
  }

  static validateOptions(options: AuthorizenetOptions): void {
    if (!isDefined(options.api_login_id)!) {
      throw new Error(
        "Required option `api_login_id` is missing in Authorizenet plugin"
      );
    } else if (!isDefined(options.transaction_key)!) {
      throw new Error(
        "Required option `transaction_key` is missing in Authorizenet plugin"
      );
    }
  }

  abstract get paymentIntentOptions(): PaymentIntentOptions;

  getPaymentIntentOptions(): Partial<PaymentIntentOptions> {
    const options: Partial<PaymentIntentOptions> = {};

    if (this?.paymentIntentOptions?.capture) {
      options.capture = this.paymentIntentOptions.capture;
    }

    if (this?.paymentIntentOptions?.setup_future_usage) {
      options.setup_future_usage = this.paymentIntentOptions.setup_future_usage;
    }

    if (this?.paymentIntentOptions?.payment_method_types) {
      options.payment_method_types =
        this.paymentIntentOptions.payment_method_types;
    }

    return options;
  }
  private getMerchantAuthentication() {
    const merchantAuthenticationType =
      new APIContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(this.options_.api_login_id);
    merchantAuthenticationType.setTransactionKey(this.options_.transaction_key);
    return merchantAuthenticationType;
  }

  private async executeTransaction(
    createRequest: APIContracts.CreateTransactionRequest,
    data: Record<string, unknown>
  ): Promise<any> {
    const paymentStatus = await this.getPaymentStatus(data);
    const ctrl = new APIControllers.CreateTransactionController(
      createRequest.getJSON()
    );

    return new Promise((resolve, reject) => {
      ctrl.execute(() => {
        const apiResponse = ctrl.getResponse();
        const response = new APIContracts.CreateTransactionResponse(
          apiResponse
        );
        if (response !== null) {
          if (
            response.getMessages().getResultCode() ===
            APIContracts.MessageTypeEnum.OK
          ) {
            if (response.getTransactionResponse().getMessages() !== null) {
              resolve({
                status: paymentStatus.status,

                data: {
                  ...response.getTransactionResponse(),
                  amount: paymentStatus.data?.amount,
                },
              });
            } else if (response.getTransactionResponse().getErrors() !== null) {
              reject({
                code: response
                  .getTransactionResponse()
                  .getErrors()
                  .getError()[0]
                  .getErrorCode(),
                message: response
                  .getTransactionResponse()
                  .getErrors()
                  .getError()[0]
                  .getErrorText(),
              });
            }
          } else {
            if (
              response.getTransactionResponse() !== null &&
              response.getTransactionResponse().getErrors() !== null
            ) {
              reject({
                code: response
                  .getTransactionResponse()
                  .getErrors()
                  .getError()[0]
                  .getErrorCode(),
                message: response
                  .getTransactionResponse()
                  .getErrors()
                  .getError()[0]
                  .getErrorText(),
              });
            } else {
              reject({
                code: response.getMessages().getMessage()[0].getCode(),
                message: response.getMessages().getMessage()[0].getText(),
              });
            }
          }
        } else {
          reject({
            code: "E00001",
            message: "No response from Authorize.Net.",
          });
        }
      });
    });
  }
  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    switch (input.data?.status) {
      // created' | 'authorized' | 'captured' | 'refunded' | 'failed'
      case "created":
        return { status: PaymentSessionStatus.REQUIRES_MORE };
      case "canceled":
        return { status: PaymentSessionStatus.CANCELED, data: input.data };
      case "require_capture":
        return { status: PaymentSessionStatus.AUTHORIZED, data: input.data };
      case "succeeded":
        return { status: PaymentSessionStatus.CAPTURED, data: input.data };
      case "refunded":
        return { status: PaymentSessionStatus.CANCELED, data: input.data };
      default:
        return { status: PaymentSessionStatus.PENDING, data: input.data };
    }
  }

  async initiatePayment(
    input: InitiatePaymentInput,
    context?: Record<string, unknown>,
    cart?: Record<string, unknown>
  ): Promise<InitiatePaymentOutput> {
    const provider = this.options_.providers?.find(
      (p) => p.id == AuthorizenetBase.identifier
    );

    if (
      !provider &&
      !this.options_.api_login_id &&
      !this.options_.transaction_key
    ) {
      throw new MedusaError(
        MedusaErrorTypes.INVALID_ARGUMENT,
        "Authorizenet not configured",
        MedusaErrorCodes.CART_INCOMPATIBLE_STATE
      );
    }

    return {
      data: {
        ...input.data,
        amount: input.amount,
        currency: input.currency_code,
      },
      id: input.data?.session_id as string,
    } as InitiatePaymentOutput;
  }

  async authorizePayment(
    paymentSessionData: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const { amount, dataValue, cart } = paymentSessionData.data as {
      amount: number;
      dataValue: string;
      cart: {
        email: string;
        billing_address: {
          city: string;
          country_code: string;
          address_1: string;
          address_2: string;
          province: string;
          postal_code: string;
          first_name: string;
          last_name: string;
          phone: string;
        };
        shipping_methods: Shipping[];
      };
    };
    const shipping = new APIContracts.ExtendedAmountType();
    shipping.setAmount(cart.shipping_methods[0].amount);
    shipping.setName(cart.shipping_methods[0].name);
    shipping.setDescription(cart.shipping_methods[0].name);

    const billTo = new APIContracts.CustomerAddressType();
    billTo.setFirstName(cart.billing_address?.first_name);
    billTo.setLastName(cart.billing_address?.last_name);
    billTo.setAddress(
      `${cart.billing_address?.address_1} ,${cart.billing_address?.address_2}`
    );
    billTo.setCity(cart.billing_address?.city);
    billTo.setState(cart.billing_address?.province);
    billTo.setZip(cart.billing_address?.postal_code);
    billTo.setCountry(cart.billing_address?.country_code);

    const shipTo = new APIContracts.CustomerAddressType();
    shipTo.setFirstName(cart.billing_address?.first_name);
    shipTo.setLastName(cart.billing_address?.last_name);
    shipTo.setAddress(
      `${cart.billing_address?.address_1} ,${cart.billing_address?.address_2}`
    );
    shipTo.setCity(cart.billing_address?.city);
    shipTo.setState(cart.billing_address?.province);
    shipTo.setZip(cart.billing_address?.postal_code);
    shipTo.setCountry(cart.billing_address?.country_code);
    const opaqueData = new APIContracts.OpaqueDataType();
    opaqueData.setDataDescriptor("COMMON.ACCEPT.INAPP.PAYMENT");
    opaqueData.setDataValue(dataValue);

    const paymentType = new APIContracts.PaymentType();
    paymentType.setOpaqueData(opaqueData);
    const transactionRequestType = new APIContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(
      APIContracts.TransactionTypeEnum.AUTHONLYTRANSACTION
    );
    const solution = new APIContracts.SolutionType();
    solution.setId(this.solutionID);

    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(amount);
    transactionRequestType.setSolution(solution);
    transactionRequestType.setShipping(shipping);
    transactionRequestType.setBillTo(billTo);
    transactionRequestType.setShipTo(shipTo);
    // Only support USD as of now
    // transactionRequestType.setCurrencyCode(currency.toLocaleUpperCase());
    //transactionRequestType.setRefTransId(paymentSessionData.context.idempotency_key);
    const createRequest = new APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(this.getMerchantAuthentication());
    createRequest.setTransactionRequest(transactionRequestType);
    // createRequest.setRefId(idempotency_key);

    const data = {
      data: {
        ...paymentSessionData,
        status: this.options_.capture ? "succeeded" : "require_capture",
      },
    };
    const sessionData = await this.executeTransaction(createRequest, data);
    return sessionData;
  }

  async cancelPayment(
    paymentSessionData: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    return this.voidPayment(paymentSessionData);
  }

  async capturePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderOutput> {
    const { transId, amount } = paymentSessionData?.data as {
      transId: string;
      amount: number;
    };
    console.log(paymentSessionData);

    const orderDetails = new APIContracts.OrderType();
    orderDetails.setInvoiceNumber("INV-12345");
    orderDetails.setDescription("Product Description");

    const transactionRequestType = new APIContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(
      APIContracts.TransactionTypeEnum.PRIORAUTHCAPTURETRANSACTION
    );
    transactionRequestType.setRefTransId(transId);
    transactionRequestType.setAmount(amount);
    transactionRequestType.setOrder(orderDetails);

    const createRequest = new APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(this.getMerchantAuthentication());
    createRequest.setTransactionRequest(transactionRequestType);
    const data = {
      data: {
        ...paymentSessionData,
        status: "succeeded",
      },
    };
    const sessionData = await this.executeTransaction(createRequest, data);
    return sessionData;
  }

  async deletePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderOutput> {
    return await this.cancelPayment(paymentSessionData);
  }

  async getTransactionDetails(transactionId: string): Promise<any> {
    const getRequest = new APIContracts.GetTransactionDetailsRequest();
    getRequest.setMerchantAuthentication(this.getMerchantAuthentication());
    getRequest.setTransId(transactionId);
    const ctrl = new APIControllers.GetTransactionDetailsController(
      getRequest.getJSON()
    );

    return new Promise((resolve, reject) => {
      try {
        ctrl.execute(() => {
          let apiResponse = ctrl.getResponse();
          let transactionDetailsResponse =
            new APIContracts.GetTransactionDetailsResponse(apiResponse);
          if (
            transactionDetailsResponse != null &&
            transactionDetailsResponse.getMessages().getResultCode() ===
              APIContracts.MessageTypeEnum.OK
          ) {
            resolve(transactionDetailsResponse.transaction);
          }
        });
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }
  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const { value } = input.amount as BigNumberRawValue;
    const { transId } = input.data as {
      transId: string;
    };
    const transactionDetails = await this.getTransactionDetails(transId);
    const maskedCardNumber = transactionDetails.payment
      ?.creditCard as APIContracts.CreditCardMaskedType;
    maskedCardNumber.cardNumber = maskedCardNumber.cardNumber.substr(4, 4);
    delete maskedCardNumber.cardType;
    const paymentType = new APIContracts.PaymentType();
    paymentType.setCreditCard(maskedCardNumber);
    const transactionRequestType = new APIContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(
      APIContracts.TransactionTypeEnum.REFUNDTRANSACTION
    );
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(value);
    transactionRequestType.setRefTransId(transId);
    const createRequest = new APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(this.getMerchantAuthentication());
    createRequest.setTransactionRequest(transactionRequestType);
    const data = {
      data: {
        ...input,
        status: "refunded",
      },
    };
    const sessionData = this.executeTransaction(createRequest, data);
    return sessionData as RefundPaymentOutput;
  }

  async retrievePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderOutput> {
    let intent;
    try {
      const transactionId = paymentSessionData.transId as string;
      intent = await this.getTransactionDetails(transactionId);
    } catch (error) {
      throw new Error(
        "An error occurred in retrievePayment during the retrieve of the cart"
      );
    }
    return intent as unknown as PaymentProviderOutput;
  }
  async voidPayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderOutput> {
    const transactionId = paymentSessionData.transId;
    const transactionRequestType = new APIContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(
      APIContracts.TransactionTypeEnum.VOIDTRANSACTION
    );
    transactionRequestType.setRefTransId(transactionId);

    const createRequest = new APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(this.getMerchantAuthentication());
    createRequest.setTransactionRequest(transactionRequestType);
    const data = {
      data: {
        ...paymentSessionData,
        status: "canceled",
      },
    };
    const response = await this.executeTransaction(createRequest, data);
    return response;
  }

  async updatePayment(input: any): Promise<PaymentProviderOutput> {
    // const { amount, currency_code, context } = input;
    // const { customer, billing_address, extra } = context;
    // if (!billing_address && customer?.addresses?.length == 0) {
    //     return this.buildError(
    //         "An error occurred in updatePayment during the retrieve of the cart",
    //         new Error(
    //             "An error occurred in updatePayment during the retrieve of the cart"
    //         )
    //     );
    // }

    return { data: input };
  }

  async updatePaymentData(
    sessionId: string,
    data: Record<string, unknown>
  ): Promise<PaymentProviderOutput> {
    return { data: data };
  }
  /*
  /**
   * @param {object} data - the data of the webhook request: req.body
   * @param {object} signature - the Razorpay signature on the event, that
   *    ensures integrity of the webhook event
   * @return {object} Razorpay Webhook event
   */

  constructWebhookEvent(data, signature): boolean {
    const provider = this.options_.providers?.find(
      (p) => p.id == AuthorizenetBase.identifier
    );

    if (
      !provider &&
      !this.options_.api_login_id &&
      !this.options_.transaction_key
    ) {
      throw new MedusaError(
        MedusaErrorTypes.INVALID_ARGUMENT,
        "razorpay not configured",
        MedusaErrorCodes.CART_INCOMPATIBLE_STATE
      );
    }
    return false;
  }

  // async getWebhookActionAndData(
  //     webhookData: ProviderWebhookPayload["payload"]
  // ): Promise<WebhookActionResult> {
  //     return webhookData as WebhookActionResult
  // }
}

export default AuthorizenetBase;
