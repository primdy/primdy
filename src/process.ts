export async function title(title: string, isBun: boolean = false) {
  process.title = title;
  if (!isBun || process.platform !== "linux") return;
  try {
    const { dlopen, FFIType, ptr } = await import("bun:ffi");
    const { symbols } = dlopen("libc.so.6", {
      prctl: {
        args: [FFIType.i32, FFIType.ptr, FFIType.u64, FFIType.u64, FFIType.u64],
        returns: FFIType.i32,
      },
    });
    const PR_SET_NAME = 15;
    symbols.prctl(PR_SET_NAME, ptr(Buffer.from(`${title}\0`)), 0n, 0n, 0n);
  } catch {
    //
  }
}
