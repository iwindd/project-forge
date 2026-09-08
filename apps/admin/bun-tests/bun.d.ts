declare module "bun:test" {
  export function test(
    name: string,
    callback: () => void | Promise<void>,
    timeout?: number,
  ): void;
}

declare const Bun: {
  spawnSync(
    command: string[],
    options: {
      cwd: string;
      stderr: "inherit";
      stdout: "inherit";
    },
  ): { exitCode: number };
};
