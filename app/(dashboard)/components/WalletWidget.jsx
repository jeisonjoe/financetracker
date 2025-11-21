import { cFormat } from "@/app/utils/currencyFormat";
import React from "react";
import { BiChevronDown, BiRupee } from "react-icons/bi";

export default function WalletWidget() {
  const data = [
    {
      id: 1,
      name: "SBI Debit Card",
      balance: 3000,
      spent: 1256,
      earned: 1744,
    },
    {
      id: 2,
      name: "HDFC Debit Card",
      balance: 22468,
      spent: 25841,
      earned: 52461,
    },
    {
      id: 3,
      name: "Cash",
      balance: 800,
      spent: 126,
      earned: 80,
    },
  ];

  return (
    <div className="grow flex flex-col gap-2 bg-white rounded-lg p-6">
      <div className="flex justify-between items-center">
        <span className="text-lg text-card-title">My Wallet</span>
        <button className="flex gap-2 items-center text-sec-96 bg-app-bg p-4 py-2 rounded-lg text-sm">
          This Month <BiChevronDown />
        </button>
      </div>

      <div className="px-2 overflow-auto no-scrollbar">
        {data.map((item) => {
          return (
            <div
              key={item.id}
              className="flex flex-col gap-4 border-b border-b-zinc-100 py-4 last-of-type:border-b-0"
            >
              <div className="text-wallet-item-title text-lg">{item.name}</div>
              <div className="flex justify-between items-baseline">
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-sm text-sec-96">Balance</span>
                  <div className="flex items-baseline text-card-title">
                    <BiRupee />
                    <span className="text-2xl font-semibold ">
                      {cFormat(item.balance)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-8">
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-sm text-sec-96">Spent</span>
                    <div className="flex items-baseline  text-red-100">
                      <span className="text-xl font-normal tracking-wider">
                        -{cFormat(item.spent)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-sm text-sec-96">Earned</span>
                    <div className="flex items-baseline  text-green-100">
                      <span className="text-xl font-normal tracking-wider">
                        +{cFormat(item.earned)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
