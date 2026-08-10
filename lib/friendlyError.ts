export function toFriendlyMessage(error: { message?: string } | null | undefined): string {
  const message = error?.message?.toLowerCase() ?? "";

  if (message.includes("jwt") || message.includes("expired")) {
    return "Phiên đăng nhập đã hết hạn, bạn đăng nhập lại giúp mình nhé.";
  }

  if (message.includes("permission") || message.includes("policy") || message.includes("not allowed")) {
    return "Bạn chưa có quyền thực hiện việc này.";
  }

  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("failed to fetch") ||
    message.includes("offline")
  ) {
    return "Mất kết nối mạng. Kiểm tra Wi-Fi/4G rồi thử lại nhé.";
  }

  return "Có lỗi xảy ra, bạn thử lại sau một chút nhé.";
}
