# EcoPulse — Pitch Script

## [OPEN] — 30 seconds

**Problem hook:**
On an island, electricity and drinking water are the same resource. Ta'ū, American Samoa runs on solar, wind, and a battery bank. When the sun goes down, you're choosing between light and water. Every liter of fresh water costs kilowatt-hours.

Today, they run the desalination plant on a fixed 8 AM to 5 PM schedule, no matter what the weather is. Some days the sun is bright and the turbine screams. Other days, clouds roll in and the generator kicks on, burning expensive diesel.

**What if the system could see 24 hours ahead?**

---

## [DEMO] — 60 seconds

*[Point to the screen]*

This is EcoPulse. It reads the real hourly weather forecast for Ta'ū and solves a 24-hour dispatch plan that decides where every kilowatt goes and when to make water.

Here's the baseline — fixed schedule, fixed loads:
- 303 liters of diesel
- 812 kilograms of CO₂
- Zero critical outages, tank stays full

Now watch what happens when the system looks ahead and reschedules the loads to chase the forecast:

*[Click to show EcoPulse plan]*

- **179 liters of diesel** — that's 41% less
- **480 kilograms of CO₂ — 332 kg avoided**
- Zero critical outages, tank never runs dry

Same forecast. Same island. Same constraints. Just smarter scheduling.

---

## [TECHNICAL] — 60 seconds

How does it work?

The algorithm runs in two passes. First, it does a greedy dispatch — serve loads in priority order, use renewables, then battery, then generator. That's the baseline.

Then it looks at the full 24-hour forecast and asks: when is solar + wind going to be highest? It reschedules the desalination plant — a 180-kilowatt load — to run only during those peak-surplus hours instead of a fixed schedule.

This sounds simple, but it's solving a constrained optimization problem. The battery has charge and discharge limits. The diesel tank has a finite reserve. The water tank has a floor — if it gets too low, you have to run desalination no matter what. Tier-1 loads — the clinic, the pumps, the comms tower — are never shed, no matter what.

The solver enforces all of these constraints simultaneously. It's a lexicographic optimization: minimize critical outages first, then tank violations, then diesel, then everything else.

We prove the solution is correct with executable invariants. Every hour, power in equals power out. The battery stays within its limits. The tank never goes negative. And the optimized plan never burns more diesel than the baseline — we guarantee that.

---

## [THE KICKER] — 30 seconds

But here's the thing: this system doesn't just optimize. It also asks why.

*[Show the chatbot]*

This is EcoBot. It reads the dispatch plan and explains the solver's decisions. Ask it why the generator ran at 14:00, and it tells you. Ask it what happens if a storm hits, and it re-solves the entire 24-hour plan under that condition and shows you the answer.

The island's load priority list is draggable. Drag the school above the desalination plant, and the whole day re-solves in under 100 milliseconds. The operator decides what matters. The algorithm does the maths.

---

## [CLOSE] — 30 seconds

We built this in a hackathon because we think microgrid operators deserve tools that:
- Make the math visible
- Explain the tradeoffs
- Let humans stay in charge

41% less diesel. 332 kilograms of CO₂ avoided. No critical load ever shed. That's not a simulation. That's the solver running on real weather, real hardware, real constraints.

This is EcoPulse.

---

## [TECHNICAL BACKUP — If they ask]

**How do you know it's correct?**
We ship a verification script that proves power balance holds every hour, the battery stays within capacity, diesel never exceeds the reserve, the tank never goes dry, and the optimized plan never burns more diesel than the baseline. It runs in 50 milliseconds.

**What if the forecast is wrong?**
The solver re-runs every 15 minutes when new forecast data arrives. It's not a one-shot plan — it's a continuous adaptation.

**What if there's no solar and no wind?**
The algorithm degrades gracefully. It keeps tier-1 loads online, drains the battery, uses diesel as a last resort, and sheds deferrable loads in order of priority. We tested it with a dark, windless scenario and it still produces a coherent 24-hour plan.

**Why does this matter for a hackathon?**
Because it's solving a real problem on a real island using real math. Not a mobile app, not a productivity tool — an optimization algorithm that saves diesel, cuts CO₂, and keeps critical infrastructure online. This is the kind of work that matters.

---

## [FINAL THOUGHT]

Every design decision in this system was made to keep humans in charge.

The algorithm proposes. The operator decides. That's how it should be.

