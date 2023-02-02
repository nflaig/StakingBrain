import https from "node:https";
import http from "node:http";
import { ApiParams, AllowedMethods } from "@stakingbrain/common";

export class StandardApi {
  private useTls = false;
  requestOptions: https.RequestOptions;

  constructor(apiParams: ApiParams) {
    const urlOptions = new URL(apiParams.baseUrl + (apiParams.apiPath || ""));

    this.requestOptions = {
      hostname: urlOptions.hostname,
      port: urlOptions.port,
      path: urlOptions.pathname,
      protocol: urlOptions.protocol,
    };

    this.requestOptions.headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "Bearer " + apiParams.authToken,
      ...(apiParams.host && { Host: apiParams.host }),
    };

    if (apiParams.tlsCert) {
      this.requestOptions.pfx = apiParams.tlsCert;
      this.requestOptions.passphrase = "dappnode";
      this.useTls = true;
    }
  }

  protected async request(
    method: AllowedMethods,
    endpoint: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body?: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    let req: http.ClientRequest;

    this.requestOptions.method = method;
    this.requestOptions.path = endpoint;

    if (this.useTls) {
      //process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      this.requestOptions.rejectUnauthorized = false;
      req = https.request(this.requestOptions);
    } else {
      req = http.request(this.requestOptions);
    }

    if (body) {
      if (req.method !== "POST") {
        req.setHeader("Transfer-Encoding", "chunked"); //To avoid the body being ignored in DELETE requests
      }
      req.write(body);
    }

    req.on("error", (e) => {
      console.error(e);
    });

    req.end();

    return new Promise((resolve, reject) => {
      req.on("response", (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data = chunk;
        });

        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            console.log("Error while parsing response:" + e);
            reject("Error while parsing response:" + e);
          }
        });
      });
    });
  }
}