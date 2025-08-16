import Image from "next/image";
import Link from "next/link";
import AppleWhiteLarge from "../../../public/uploads/apple-white-large";
import PlayStoreColored from "../../../public/uploads/play-store-colored";

export default function HomeScreen() {
  return (
    <div
      id="home"
      className="bg-black bg-[url('/uploads/vector.svg')] bg-cover bg-center h-[92vh] text-white grid grid-cols-1 md:grid-cols-[55%_45%] items-center "
    >
      <div className="space-y-3 text-center md:text-left px-6 md:p-10">
        <h1 className="text-5xl font-calsans">
          Saving Solutions built for Nigeria&apos;s Informal Sector
        </h1>
        <p className="text-[#F7F9FC] text-sm md:text-base leading">
          Digitizing daily contributions for traders, commercial transporters{" "}
          <br className="hidden md:block" />
          and artisans through agent-assisted models
        </p>

        <div className="flex items-center gap-4">
          <Link href="/">
            <AppleWhiteLarge />
          </Link>
          <Link href="/">
            <PlayStoreColored />
          </Link>
        </div>
      </div>
      <div className="h-full flex justify-center items-center">
        <Image
          src="/uploads/chain.svg"
          alt="Chain"
          width={1}
          height={1}
          className="w-[250px] md:w-[510px]"
          priority
        />
      </div>
    </div>
  );
}
