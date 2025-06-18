import { TbPlug } from "react-icons/tb";

export default function HomeScreen() {
  return (
    <div
      id="home"
      className="bg-white bg-[url('/uploads/homebg.jpg')] bg-cover bg-top h-[80vh] text-black grid grid-cols-1 md:grid-cols-[55%_45%] items-center relative"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white via-[#f9fafbcc] to-transparent" />
      <div className="space-y-5 text-center md:text-left p-14 z-10">
        <div className="px-4 py-2 bg-[#F9FAFB] rounded-full flex items-center gap-4 text-[#101928] font-semibold">
          Be the Surest Plug
          <TbPlug size={24} />
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-calsans leading-tight">
            Make Money while <br className="hidden md:block" /> Helping Others
            Save
          </h1>
          <p className="text-[#101928] text-sm md:text-base leading">
            Help customers save money and earn commissions on every{" "}
            <br className="hidden md:block" />
            transaction. <br className="hidden md:block" />
          </p>
        </div>
      </div>
    </div>
  );
}
