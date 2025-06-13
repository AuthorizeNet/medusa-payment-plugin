# Payment-Authorize.net-Medusa


Dear Developers and E-commerce Enthusiasts,

Are you ready to revolutionize the world of online stores with MedusaJS? We have an exciting opportunity that will make payment processing a breeze for our beloved Medusa platform! Introducing the Payment-Authorizenet provider, a community-driven project that brings the immensely popular [Authorize.net](https://www.authorize.net/) payment gateway to our MedusaJS commerce stack.

**What's in it for You?**

🚀 Streamline Payment Processing: With payment-authorizenet-medusa, you can unleash the full potential of Authorize.net's features, ensuring seamless and secure payments for your customers.

**Features:**

**Authorize Payment** : Authorize funds on a customer's card without immediate charge.

**Capture Payment**   : Charge the previously authorized funds.

**Auth-and-Capture**  : Authorize and capture funds in a single seamless step.

**Cancel Payment**    : Cancel an authorization before the payment is captured.

**Void Payment**      : Void a transaction before it has been settled.

**Refund Payment**    : Process refunds for transactions that have already been settled.

## Installation Made Simple

No hassle, no fuss! Install Payment-Authorizenet effortlessly with npm:



[Authorize.net](https://www.authorize.net/)  an immensely popular payment gateway with a host of features. 
This provider enables the Authorize.net payment interface on [Medusa](https://medusajs.com) commerce stack

## Installation

Use the package manager npm to install Payment-Authorizenet.

```bash
npm install payment-authorizenet-medusa

```

## Usage


Register for a [Authorize.net](https://developer.authorize.net/hello_world/sandbox.html) account and generate the api keys
In your environment file (**.env**) you need to define 
```
API_LOGIN_ID=<your AUTHORIZE_NET_API_LOGIN_ID>
TRANSACTION_KEY=<your AUTHORIZE_NET_TRANSACTION_KEY>

```
You need to add the provider into your **medusa-config.ts** as shown below

```
module.exports = defineConfig({
modules: [
    {      
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "payment-authorizenet-medusa",
            id: "authorizenet",
            options: {
              api_login_id: process.env.AUTHORIZE_NET_API_LOGIN_ID,
              transaction_key: process.env.AUTHORIZE_NET_TRANSACTION_KEY,
              capture: <boolean>,
              enviornment: "sandbox", // <sandbox | production> based on enviornment Api's will point accordingly
            },
          },
        ],
     } 
    },
  ]
})
```
## Client side configuration


For the NextJs start you need to  make the following changes 

**Step 1.**

Install package to your next starter. This just makes it easier, importing all the scripts implicitly

```bash
npm install authorizenet-react 
```
or 

```bash
yarn add authorizenet-react 

```

**Step 2.** 

Add environment variables in the client (storefront) (**.env**)

```bash
  ANUTHORIZENET_PUBLIC_CLIENT_KEY= <your ANUTHORIZENET PUBLIC CLIENT KEY>
  ANUTHORIZENET_PUBLIC_API_LOGIN_ID= <your ANUTHORIZENET API LOGIN ID>
```

**Step 3.** 

Add **<next-starter>/src/lib/constants.tsx**


```
export const isAuthorizeNet = (providerId?: string) => {
  return providerId?.startsWith("pp_authorizenet")
}


// and the following to the list

  "pp_authorizenet_authorizenet":{
    title: "Authorize.net",
    icon: <CreditCard />,
  },

````

**Step 4.** 

Add a AuthoirizenetCardConatiner in **<next-starter>/src/modules/checkout/components/payment-conatiner/index.tsx**

```
import { AuthorizeNetProvider,Card} from "authorizenet-react"

export const AuthorizeNetCardContainer = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  setCardBrand,
  setError,
  setCardComplete,
  setOpaqueData,
  cardComplete
}: Omit<PaymentContainerProps, "children"> & {
  setCardBrand: (brand: string) => void
  setError: (error: string | null) => void
  setCardComplete: (complete: boolean) => void
  cardComplete:boolean
}) => {
  return (
    <PaymentContainer
      paymentProviderId={paymentProviderId}
      selectedPaymentOptionId={selectedPaymentOptionId}
      paymentInfoMap={paymentInfoMap}
      disabled={disabled}
    >
      {selectedPaymentOptionId === paymentProviderId &&
        ((isAuthorizeNet(selectedPaymentOptionId)) ? (
          <AuthorizeNetProvider 
            apiLoginId={process.env.NEXT_PUBLIC_API_LOGIN_ID} 
            clientKey={process.env.NEXT_PUBLIC_CLIENT_KEY}>
             <div className="my-4 transition-all duration-150 ease-in-out">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                Enter your card details:
              </Text>
              <Card
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4'
                      }
                    },
                    invalid: {
                      color: '#9e2146'
                    }
                  }
                
                }}
                onChange={(e:any)=>{ 
                  setCardComplete(e.complete)
                  setError(e.error?.message || null)
                }}
              />
            </div>  
          </AuthorizeNetProvider>
        ) : (
          <SkeletonCardDetails />
        ))}
    </PaymentContainer>
  )
}
```
**Step 5.** 

add AuthorizeNetCardContainer in the client **<next-starter>/src/modules/checkout/components/payment/index.tsx**
```
import PaymentContainer, {
  StripeCardContainer,
  AuthorizeNetCardContainer
} from "@modules/checkout/components/payment-container"

 <>
  <RadioGroup
    value={selectedPaymentMethod}
    onChange={(value: string) => setPaymentMethod(value)}
  >
    {availablePaymentMethods.map((paymentMethod) => (
      <div key={paymentMethod.id}>
        {isStripeFunc(paymentMethod.id) ? (
          <StripeCardContainer
            paymentProviderId={paymentMethod.id}
            selectedPaymentOptionId={selectedPaymentMethod}
            paymentInfoMap={paymentInfoMap}
            setCardBrand={setCardBrand}
            setError={setError}
            setCardComplete={setCardComplete}
          />
        ) :
        (isAuthorizeNetFunc(paymentMethod.id) ? (
          <AuthorizeNetCardContainer
            paymentProviderId={paymentMethod.id}
            selectedPaymentOptionId={selectedPaymentMethod}
            paymentInfoMap={paymentInfoMap}
            setCardBrand={setCardBrand}
            setError={setError}
            setCardComplete={setCardComplete}
            setOpaqueData={setOpaqueData}
            cardComplete={cardComplete}
          />
        ): (
          <PaymentContainer
            paymentInfoMap={paymentInfoMap}
            paymentProviderId={paymentMethod.id}
            selectedPaymentOptionId={selectedPaymentMethod}
          />
        ))}
      </div>
    ))}
  </RadioGroup>
</>
 ....
```
**Step 6.** 

modify initiatePaymentSession in the client **<next-starter>/src/modules/checkout/components/payment/index.tsx**
```

import {createToken} from "authorizenet-react"


 const handleSubmit = async () => {
    setIsLoading(true)
    try {

      const response = await createToken();
     
      const shouldInputCard =
        isStripeFunc(selectedPaymentMethod) && !activeSession

      const checkActiveSession =
        activeSession?.provider_id === selectedPaymentMethod

      if (!checkActiveSession) {
        await initiatePaymentSession(cart, {
          provider_id: selectedPaymentMethod,
          data: {
            ...response,
            cart // provides cart data to plugin
          },
        })
      }

      if (!shouldInputCard) {
        return router.push(
          pathname + "?" + createQueryString("step", "review"),
          {
            scroll: false,
          }
        )
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }
 ....
```
**Step 7.** 

Create a button for Autorize.net **<next-starter>/src/modules/checkout/components/payment-button/authorizenet-payment-button.tsx**

like below

````
const AuthorizenetPaymentButton = ({ notReady }: { notReady: boolean }) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((err) => {
        setErrorMessage(err.message)
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const handlePayment = () => {
    setSubmitting(true)

    onPaymentCompleted()
  }

  return (
    <>
      <Button
        disabled={notReady}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        data-testid="submit-order-button"
      >
        Place order
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="manual-payment-error-message"
      />
    </>
  )
}

`````
**Step 8.**

Add into the payment element **<next-starter>/src/modules/checkout/components/payment-button/index.tsx**

then
```
 case isAuthorizeNet(paymentSession?.provider_id):
        return(
          <AuthorizenetPaymentButton
            notReady={notReady}
            data-testid={dataTestId}
          />
        )
```
#### watch out

Caveat the default starter template has an option which says use the same shipping and billing address
please ensure you deselect this and enter the phone number manually in the billing section.



## Contributing


Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[MIT](https://choosealicense.com/licenses/mit/)


## Disclaimer
The code was tested on limited number of usage scenarios. There maybe unforseen bugs, please raise the issues as they come, or create pull requests if you'd like to submit fixes.


