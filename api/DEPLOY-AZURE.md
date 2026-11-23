# Deploy to Azure Container Apps

Not yet run end to end: these steps were written without Azure access, so treat the first run as the test.

Use a **personal** Azure subscription, not a work tenant.

## 1. Create and deploy
`az containerapp up` builds the image in the cloud (no local Docker needed) and creates the registry and environment.

```sh
az login
az group create -n rg-nathancj -l eastus2

az containerapp up \
  --name nathancj-api \
  --resource-group rg-nathancj \
  --location eastus2 \
  --source ./api \
  --ingress external --target-port 8080 \
  --env-vars ALLOWED_ORIGINS=https://nathancj.com
```

The command prints the app URL (`https://nathancj-api.<hash>.<region>.azurecontainerapps.io`). Check it:

```sh
curl https://<that-url>/health
curl -H "Origin: https://nathancj.com" https://<that-url>/api/status
```

## 2. Cold starts
By default Container Apps can scale to zero, so the first request after idle time can take several seconds. The site's terminal gives up after 3 seconds, so `status` would show a timeout. Pick one:

```sh
# always keep one replica (small constant cost, no cold start)
az containerapp update -n nathancj-api -g rg-nathancj --min-replicas 1
```

or accept the cold start, and let the terminal's `status` show the timeout message. Check current pricing in the Azure pricing calculator before choosing.

## 3. Custom domain: api.nathancj.com
In your DNS provider for `nathancj.com`, add:

| Type | Name | Value |
|---|---|---|
| CNAME | `api` | the app's FQDN (`nathancj-api.<hash>.<region>.azurecontainerapps.io`) |
| TXT | `asuid.api` | the verification ID from `az containerapp show -n nathancj-api -g rg-nathancj --query properties.customDomainVerificationId -o tsv` |

Then bind it and get a free managed certificate:

```sh
az containerapp hostname add -n nathancj-api -g rg-nathancj --hostname api.nathancj.com
az containerapp hostname bind -n nathancj-api -g rg-nathancj --hostname api.nathancj.com \
  --environment <environment-name> --validation-method CNAME
```

## 4. Point the site at it
In Netlify, set the build variable `PUBLIC_API_URL=https://api.nathancj.com` and redeploy. Then try `status` in the site's terminal.

## 5. Rate limiting behind the Azure proxy
The API limits each client to 60 requests a minute. Behind Container Apps' ingress, every request appears to come from the proxy, so until you tell it which header carries the client address, all visitors share one bucket.

1. Make a test request and find out which header holds your address (Container Apps normally sets `X-Forwarded-For`).
2. Set it: `az containerapp update -n nathancj-api -g rg-nathancj --set-env-vars CLIENT_IP_HEADER=X-Forwarded-For`

The API uses the **last** entry in that header, because the proxy appends the real address and anything before it can be forged by the client. If your traffic passes through more than one proxy, the last entry may be an internal address. Check the value you get before relying on it.

## Updating
Re-run the `az containerapp up` command from step 1 to build and deploy a new revision.

## Tearing down
`az group delete -n rg-nathancj` removes everything created above.
