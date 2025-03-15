declare module "prompts" {
  interface PromptObject<T extends string = string> {
    type: string;
    name: T;
    message: string;
    validate?: (value: string) => boolean | string;
  }

  function prompts<T extends string = string>(
    questions: PromptObject<T> | PromptObject<T>[]
  ): Promise<{ [K in T]: string }>;
  export default prompts;
}
