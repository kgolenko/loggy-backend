export interface IBootstrapProduct {
  bootstrap: (appModule: any) => Promise<void>;
}
