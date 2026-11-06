import { logActivity } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { hasDatabase } from "@/lib/db";
import { findReservations, parseFilters } from "@/lib/reservation-filters";

const MAX_ROWS = 5000;

/*
  Cells that start with = + - @ (or a tab/CR) are prefixed with an apostrophe,
  so a guest's name can never run as a formula when the file is opened in Excel.
*/
function cell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/*
  The reservations list with its current filters, as CSV for Excel (semicolons
  and a BOM, as German Excel expects). Route handlers are not covered by the
  admin layout's guard, so the owner check happens here.
*/
export async function GET(request: Request) {
  const me = await getSession();
  if (!me || me.role !== "owner") return new Response("Not allowed.", { status: 403 });
  if (!hasDatabase()) return new Response("No database.", { status: 503 });

  const params = new URL(request.url).searchParams;
  const filters = parseFilters((key) => params.get(key));
  const { rows, total } = await findReservations(filters, MAX_ROWS, 0);

  const header = ["Datum", "Uhrzeit", "Bis", "Gäste", "Art", "Anlass", "Status", "Name", "Telefon", "E-Mail", "Konto", "Nachricht", "Interne Notiz", "Eingegangen"];
  const lines = rows.map((r) =>
    [
      r.date,
      r.time,
      r.end_time ?? "",
      r.guests,
      r.is_private ? "Privat" : "Tisch",
      r.occasion,
      r.status,
      r.name,
      r.phone,
      r.email,
      r.account_email ?? "",
      r.message,
      r.admin_note,
      new Date(r.created_at).toISOString(),
    ]
      .map(cell)
      .join(";"),
  );
  await logActivity(me, "reservation.export", "reservation", "", `${rows.length} von ${total} Reservierungen`);

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(`﻿${[header.map(cell).join(";"), ...lines].join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reservierungen-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
