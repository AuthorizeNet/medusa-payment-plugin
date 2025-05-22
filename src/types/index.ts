export interface AuthorizenetOptions {
  api_login_id: string;
  transaction_key: string;
  capture?: boolean;
}

export interface PaymentIntentOptions {
  capture?: "automatic" | "manual";
  setup_future_usage?: "on_session" | "off_session";
  payment_method_types?: string[];
}

export const ErrorCodes = {
  PAYMENT_INTENT_UNEXPECTED_STATE: "payment_intent_unexpected_state",
  UNSUPPORTED_OPERATION: "payment_intent_operation_unsupported",
};

export const ErrorIntentStatus = {
  SUCCEEDED: "succeeded",
  CANCELED: "canceled",
};

export const PaymentProviderKeys = {
  AUTHORIZENET: "authorizenet",
};

export interface AuthorizenetProviderConfig {
  providers: Provider[];
  database: Database;
}

export interface Provider {
  resolve: string;
  id: string;
  options: Options;
}

export interface Options {
  api_login_id: string;
  transaction_key: string;
  capture?: boolean;
  enviornment?: string;
}

export interface Database {
  clientUrl: string;
  schema: string;
  driverOptions: DriverOptions;
  debug: boolean;
  connection: string;
}

export interface DriverOptions {
  connection: Connection;
}

export interface Connection {
  ssl: boolean;
}

export interface WebhookEventData {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: Payload;
  created_at: number;
}

export interface Payload {
  payment: Payment;
}

export interface Payment {
  entity: Entity;
}

export interface Entity {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  invoice_id: any;
  international: boolean;
  method: string;
  amount_refunded: number;
  refund_status: any;
  captured: boolean;
  description: string;
  card_id: any;
  bank: any;
  wallet: any;
  vpa: string;
  email: string;
  contact: string;
  notes: Notes;
  fee: any;
  tax: any;
  error_code: any;
  error_description: any;
  error_source: any;
  error_step: any;
  error_reason: any;
  acquirer_data: AcquirerData;
  created_at: number;
  upi: Upi;
}

export interface Notes {
  session_id: string;
  resource_id: string;
}

export interface AcquirerData {
  rrn: string;
  upi_transaction_id: string;
}

export interface Upi {
  vpa: string;
}

export interface Shipping {
  id: string;
  name: string;
  amount: Number;
}
