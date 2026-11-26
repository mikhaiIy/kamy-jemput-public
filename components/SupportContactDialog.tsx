"use client"

import { ArrowRight } from "lucide-react"
import { Button, type ButtonProps } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  parsePaymentSupportContact,
  type PaymentSupportContact,
} from "@/lib/payment-support"

type Props = {
  contact: PaymentSupportContact
  variant?: ButtonProps["variant"]
  size?: ButtonProps["size"]
  className?: string
}

export function SupportContactDialog({
  contact,
  variant = "default",
  size = "default",
  className,
}: Props) {
  const { email, whatsapp } = parsePaymentSupportContact(contact)
  const linkClass = "break-all font-semibold text-primary underline underline-offset-2"

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className || "w-full"}>
          Hubungi sokongan
          <ArrowRight size={15} aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Hubungi sokongan</DialogTitle>
          <DialogDescription className="break-words rounded-xl border border-border bg-background px-4 py-3">
            {email || whatsapp ? (
              <>
                Sila hubungi{" "}
                {email && (
                  <a href={`mailto:${encodeURIComponent(email)}`} className={linkClass}>
                    {email}
                  </a>
                )}
                {email && whatsapp && " atau "}
                {whatsapp && (
                  <>
                    WhatsApp{" "}
                    <a
                      href={`https://wa.me/${whatsapp.slice(1)}`}
                      target="_blank"
                      rel="noreferrer"
                      className={linkClass}
                    >
                      {whatsapp}
                    </a>
                  </>
                )}
                .
              </>
            ) : (
              "Maklumat hubungan sokongan belum tersedia. Sila cuba lagi kemudian."
            )}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
