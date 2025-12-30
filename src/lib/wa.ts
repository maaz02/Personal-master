export const sanitizePhone = (phone: string) => phone.replace(/[^\d+]/g, "");

export const isValidE164 = (phone?: string | null) => {
  if (!phone) return false;
  return /^\+\d{8,15}$/.test(phone.trim());
};

export const buildWhatsAppLink = (phone: string, message: string) => {
  const digits = sanitizePhone(phone).replace(/^\+/, "");
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encoded}`;
};

export const maskPhone = (phone?: string | null) => {
  if (!phone) return "Unknown";
  const trimmed = phone.trim();
  if (trimmed.length < 6) return trimmed;
  return `${trimmed.slice(0, 4)}***${trimmed.slice(-3)}`;
};
