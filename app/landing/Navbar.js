"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import logo from "../../public/img/logo.png";

const LINKS = [
  { href: "#recursos", label: "Recursos" },
  { href: "#oculta", label: "Operação Oculta" },
  { href: "#precos", label: "Preços" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "border-b border-border/70 bg-abyss/85 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 sm:px-10">
        <a href="#top" className="flex items-center gap-2.5">
          <Image src={logo} alt="Pandora Bot" width={26} height={26} className="rounded-md" />
          <span className="font-mono text-[13px] font-medium tracking-tight text-white">pandora_bot</span>
        </a>

        <div className="hidden items-center gap-10 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="font-mono text-[12px] tracking-wide text-white/45 transition hover:text-emerald">
              {l.label}
            </a>
          ))}
        </div>

        <a
          href="#precos"
          className="hidden items-center gap-2 border border-white/15 px-5 py-2 font-mono text-[12px] text-white transition hover:border-emerald hover:text-emerald md:flex"
        >
          começar →
        </a>

        <button onClick={() => setOpen((v) => !v)} className="grid h-9 w-9 place-items-center text-white md:hidden" aria-label="Menu">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border bg-abyss/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-6 py-4">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2.5 font-mono text-[13px] text-white/60">
                {l.label}
              </a>
            ))}
            <a href="#precos" onClick={() => setOpen(false)} className="mt-2 border border-emerald py-2.5 text-center font-mono text-[13px] text-emerald">
              começar →
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
