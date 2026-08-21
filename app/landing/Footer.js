import Image from "next/image";
import logo from "../../public/img/logo.png";
import { DOWNLOAD_URL } from "./constants";

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-14">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-10 px-6 sm:px-10 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-2.5">
          <Image src={logo} alt="" width={22} height={22} className="rounded-md" />
          <span className="font-mono text-[12px] text-white/50">pandora_bot</span>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3 font-mono text-[11.5px] text-white/35">
          <a href="#recursos" className="hover:text-emerald">recursos</a>
          <a href="#precos" className="hover:text-emerald">preços</a>
          <a href="#depoimentos" className="hover:text-emerald">depoimentos</a>
          <a href={DOWNLOAD_URL} className="hover:text-emerald">baixar</a>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-[1400px] px-6 font-mono text-[10.5px] text-white/20 sm:px-10">
        © {new Date().getFullYear()} pandora_bot — todos os direitos reservados.
      </div>
    </footer>
  );
}
