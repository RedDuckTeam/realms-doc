import { useEffect, useState } from "react";
import { Button, Code } from "nextra/components";
import { base58Encode, decodeAddress, findProgramAddress } from "./pda";

const utf8 = (text) => new TextEncoder().encode(text);

const inputClass =
  "nx-block nx-w-full nx-appearance-none nx-rounded-lg nx-px-3 nx-py-2 nx-transition-colors nx-text-base nx-leading-tight md:nx-text-sm nx-bg-black/[.05] dark:nx-bg-gray-50/10 focus:nx-bg-white dark:focus:nx-bg-dark nx-font-mono";
const hintClass = "nx-text-sm nx-text-gray-500 dark:nx-text-gray-400";

async function derive(programText, realmName, seedText) {
  const program = decodeAddress(programText);
  if (!program) return { error: "Invalid program ID: expected a base58 32-byte address." };
  const name = utf8(realmName);
  if (name.length > 32) return { error: `Invalid realm name: ${name.length} bytes, a PDA seed is at most 32.` };
  const realm = await findProgramAddress([utf8("governance"), name], program);
  const seed = decodeAddress(seedText);
  if (!seed) return { realm, error: "Invalid governance seed: expected a base58 32-byte public key." };
  const governance = await findProgramAddress([utf8("account-governance"), realm.address, seed], program);
  const treasury = await findProgramAddress([utf8("native-treasury"), governance.address], program);
  return { realm, governance, treasury };
}

export default function GovernanceAddresses() {
  const [program, setProgram] = useState("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw");
  const [realmName, setRealmName] = useState("My DAO");
  const [seed, setSeed] = useState("4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T");
  const [result, setResult] = useState(null);
  const [randomError, setRandomError] = useState("");

  useEffect(() => {
    let current = true;
    derive(program.trim(), realmName, seed.trim()).then((next) => current && setResult(next));
    return () => {
      current = false;
    };
  }, [program, realmName, seed]);

  async function randomSeed() {
    try {
      const { publicKey } = await crypto.subtle.generateKey({ name: "Ed25519" }, false, ["sign", "verify"]);
      setSeed(base58Encode(new Uint8Array(await crypto.subtle.exportKey("raw", publicKey))));
      setRandomError("");
    } catch {
      setRandomError("This browser cannot generate Ed25519 keys; paste any public key instead.");
    }
  }

  const steps = [
    { label: "Realm", seeds: '["governance", realm_name]', value: result?.realm },
    { label: "Governance", seeds: '["account-governance", realm, governance_seed]', value: result?.governance },
    { label: "DAO wallet (native treasury)", seeds: '["native-treasury", governance]', value: result?.treasury },
  ];

  return (
    <>
      <div className="nx-mt-6 nx-rounded-lg nx-border nx-border-gray-200 dark:nx-border-neutral-800 nx-p-4">
        <p className={hintClass}>
          Each address is a PDA of the program, seeded with the address above it. Everything is computed in your
          browser.
        </p>
        <label className="nx-mt-4 nx-block">
          <span className="nx-text-sm nx-font-medium">Program ID</span>
          <input className={`${inputClass} nx-mt-1`} value={program} onChange={(e) => setProgram(e.target.value)} spellCheck={false} />
        </label>
        <label className="nx-mt-4 nx-block">
          <span className="nx-text-sm nx-font-medium">Realm name</span>
          <input className={`${inputClass} nx-mt-1`} value={realmName} onChange={(e) => setRealmName(e.target.value)} spellCheck={false} />
        </label>
        <label className="nx-mt-4 nx-block" htmlFor="governance-seed">
          <span className="nx-text-sm nx-font-medium">Governance seed (any public key)</span>
        </label>
        <div className="nx-mt-1 nx-flex nx-gap-2">
          <input id="governance-seed" className={inputClass} value={seed} onChange={(e) => setSeed(e.target.value)} spellCheck={false} />
          <Button onClick={randomSeed} className="nx-shrink-0 nx-px-3 nx-text-sm">
            Random
          </Button>
        </div>
        {randomError && <p className="nx-mt-1 nx-text-sm nx-text-red-500">{randomError}</p>}

        <ol className="nx-mt-6">
          {steps.map(({ label, seeds, value }, i) => (
            <li key={label} className={i ? "nx-mt-4" : undefined}>
              <div className="nx-font-semibold">
                {i + 1}. {label}
              </div>
              <div className={hintClass}>
                PDA(<Code>{seeds}</Code>, program)
              </div>
              <div className="nx-mt-1 nx-font-mono nx-text-sm" style={{ overflowWrap: "anywhere" }}>
                {value ? (
                  <>
                    {base58Encode(value.address)} <span className={hintClass}>bump {value.bump}</span>
                  </>
                ) : (
                  <span className={hintClass}>—</span>
                )}
              </div>
            </li>
          ))}
        </ol>
        {result?.error && (
          <p className="nx-mt-4 nx-text-sm nx-text-red-500" role="alert">
            {result.error}
          </p>
        )}
      </div>
      <p className={`${hintClass} nx-mt-2`}>
        Example based on a <a href="https://plgrnd.io" className="nx-underline">PLGRND</a> flow.
      </p>
    </>
  );
}
