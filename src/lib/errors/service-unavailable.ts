export class ServiceUnavailableError extends Error {
  constructor() {
    super("SERVICE_UNAVAILABLE");
    this.name = "ServiceUnavailableError";
  }
}
