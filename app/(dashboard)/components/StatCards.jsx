import { IoWalletOutline } from "react-icons/io5";
import { BiCoinStack, BiRupee } from "react-icons/bi";
import { MdOutlineTrendingDown } from "react-icons/md";
import { GoArrowUp, GoArrowDown } from "react-icons/go";
import { cFormat } from "@/app/utils/currencyFormat";

export default function StatCards() {
  const statCards = [
    {
      name: "Balance",
      icon: IoWalletOutline,
      amount: [23680, 51],
      progression: ["inc", 12.8, "+118.8 than last month"],
    },
    {
      name: "Earnings",
      icon: BiCoinStack,
      amount: [968, 41],
      progression: ["inc", 12.8, "+118.8 than last month"],
    },
    {
      name: "Spendings",
      icon: MdOutlineTrendingDown,
      amount: [169, 43],
      progression: ["dec", 12.8, "-6.85 than last month"],
    },
  ];

  return (
    <div className="flex gap-4 pt-4">
      {statCards.map((card, i) => {
        return (
          <div
            key={card.name + i}
            className="flex flex-col grow gap-4 bg-white pr-16 p-4 rounded-lg"
          >
            <div className="flex items-center text-sec-96 gap-2">
              <card.icon />
              {card.name}
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-baseline text-amount-primary">
                <BiRupee size={24} />
                <span className="text-5xl">{cFormat(card.amount[0])}</span>
                <span className="text-2xl font-light">.{card.amount?.[1]}</span>
              </div>
              {card.progression && (
                <div
                  className={`flex items-center gap-1.5 rounded-full p-2 pr-3 pb-1.5 py-1 font-regular text-xs ${
                    card.progression[0] == "inc"
                      ? "text-green-100 bg-green-10"
                      : "text-red-100 bg-red-10"
                  }`}
                >
                  {card.progression[0] == "inc" ? (
                    <GoArrowUp />
                  ) : (
                    <GoArrowDown />
                  )}
                  {card.progression[1] + "%"}
                </div>
              )}
            </div>

            <div
              className={`text-base  px-2 ${
                card.progression[0] == "inc" ? "text-green-100" : "text-red-100"
              }`}
            >
              {card.progression[2]}
            </div>
          </div>
        );
      })}

      <div className="flex items-center flex-8 gap-4 bg-white pr-16 pl-12 p-4 rounded-lg">
        <div className="p-6 px-7 rounded-full bg-accent text-white  text-2xl">
          14
        </div>
        <div className="flex flex-col text-lg">
          <span className="">September 2025</span>
          <span className="text-sec-96">Monday</span>
        </div>
      </div>
    </div>
  );
}
