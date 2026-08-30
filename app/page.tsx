import Link from "next/link";
import "./landing.css";
import EcoBot from "@/components/EcoBot";
import { TAU } from "@/lib/island";
import { compare } from "@/lib/dispatch";
import { normalize, fetchForecast, type RawForecast } from "@/lib/openmeteo";
import cachedForecast from "@/data/tau-raw.json";
import type { ForecastHour } from "@/lib/types";

export const revalidate = 900;

const cToF = (c: number) => (c * 9) / 5 + 32;

export default async function Landing() {
  let forecast: ForecastHour[];
  let live = true;
  try {
    forecast = await fetchForecast(TAU);
  } catch {
    forecast = normalize(cachedForecast as RawForecast);
    live = false;
  }

  const cmp = compare(TAU, forecast);
  const plan = cmp.ecopulse;

  const temps = forecast.map((f) => f.tempC);
  const highF = Math.round(cToF(Math.max(...temps)));
  const lowF = Math.round(cToF(Math.min(...temps)));
  const renewablePct = Math.round(plan.totals.renewableFraction * 100);
  const dieselSaved = Math.round(cmp.dieselSavedL);
  const co2Saved = Math.round(cmp.co2SavedKg);
  const tankLow = Math.round(plan.totals.tankMinM3);
  const tankPct = Math.round((plan.totals.tankMinM3 / TAU.tankM3) * 100);

  return (
    <div className="lp">

      <section id="home" className="hero">
        <div className="hero-content">
          <p className="subtitle">ISLAND ENVIRONMENTAL MONITORING</p>
          <h1>Protect Today, Preserve Tomorrow: EcoPulse.</h1>
          <p>
            On an island, electricity and drinking water are the same resource. Every litre of
            fresh water costs kilowatt-hours. EcoPulse reads the live weather forecast for Ta&apos;ū
            and plans the whole island, hour by hour, so the clinic never goes dark and the tank
            never runs dry.
          </p>
          <div className="buttons">
            <Link href="/dashboard" className="primary-btn">
              View Live Data
            </Link>
            <a href="#solutions" className="secondary-btn">
              Explore Solutions
            </a>
          </div>
        </div>
      </section>

      <section className="stats-wrap" style={{ paddingTop: 0 }}>
        <div className="stats">
          <div className="stat-card">
            <span>🌡️</span>
            <h3>Temperature today</h3>
            <p>
              {highF}°/{lowF}°F
            </p>
          </div>
          <div className="stat-card">
            <span>⚡</span>
            <h3>Renewable share</h3>
            <p>{renewablePct}%</p>
          </div>
          <div className="stat-card">
            <span>🛢️</span>
            <h3>Diesel avoided</h3>
            <p>{dieselSaved} L</p>
          </div>
          <div className="stat-card">
            <span>💧</span>
            <h3>Freshwater tank</h3>
            <p>{tankPct}%</p>
          </div>
        </div>
      </section>

      <section id="dashboard" className="section">
        <p className="section-label">REAL-TIME INFORMATION</p>
        <h2>Today on the island</h2>
        <p>
          Every figure below comes from the dispatch solver running against{" "}
          {live ? "a live" : "a cached"} Open-Meteo forecast. Nothing here is a placeholder.
        </p>

        <div className="dashboard-grid">
          <div className="data-card">
            <h3>🌡️ Temperature</h3>
            <div className="big-number">{highF}°F</div>
            <p>Forecast high for Ta&apos;ū</p>
          </div>
          <div className="data-card">
            <h3>⚡ Renewable share</h3>
            <div className="big-number">{renewablePct}%</div>
            <p>Of all energy served today</p>
          </div>
          <div className="data-card">
            <h3>🌬️ CO₂ avoided</h3>
            <div className="big-number">{co2Saved} kg</div>
            <p>Versus a fixed daily schedule</p>
          </div>
          <div className="data-card">
            <h3>💧 Tank low point</h3>
            <div className="status good">{tankLow} m³</div>
            <p>{plan.totals.tankRanDry ? "Ran dry today" : "Never ran dry"}</p>
          </div>
        </div>

        <p className="source-note">
          The weather is a real forecast for Ta&apos;ū (−14.23, −169.45). The island&apos;s loads
          and hardware are modelled on published island-microgrid figures. There is no connection
          to physical equipment.{" "}
          <Link href="/dashboard" style={{ color: "var(--gold)" }}>
            Open the live dashboard →
          </Link>
        </p>
      </section>

      <section id="issues" className="section">
        <p className="section-label">WHAT&apos;S HAPPENING?</p>
        <h2>Environmental Challenges</h2>
        <div className="issue-grid">
          <div className="issue-card">
            <span>🛢️</span>
            <h3>Diesel Dependence</h3>
            <p>
              Remote islands ship in fuel by boat. It is expensive, it pollutes, and a delayed
              delivery becomes an outage at the clinic.
            </p>
          </div>
          <div className="issue-card">
            <span>💧</span>
            <h3>Water Costs Power</h3>
            <p>
              Desalination is the largest movable load on the island and its only source of fresh
              water, so saving power and making water pull against each other.
            </p>
          </div>
          <div className="issue-card">
            <span>🌊</span>
            <h3>Rising Sea Levels</h3>
            <p>
              Rising oceans increase flooding and threaten the low-lying coastal ground where
              island infrastructure usually sits.
            </p>
          </div>
        </div>
      </section>

      <section id="solutions" className="section">
        <p className="section-label">TAKE ACTION</p>
        <h2>Possible Solutions</h2>
        <div className="solution-grid">
          <div className="solution-card">
            <span>🔋</span>
            <h3>Use Renewable Energy</h3>
            <p>
              Solar and wind already cover {renewablePct}% of the island&apos;s demand in
              today&apos;s plan. Storage is what carries it through the night.
            </p>
          </div>
          <div className="solution-card">
            <span>🕐</span>
            <h3>Shift Load, Not People</h3>
            <p>
              Running desalination when the sun is strongest saves {dieselSaved} L of diesel today
              without anyone using less water.
            </p>
          </div>
          <div className="solution-card">
            <span>🌱</span>
            <h3>Restore Ecosystems</h3>
            <p>
              Protect forests, mangroves and wetlands. Healthy coastlines absorb storm surge that
              would otherwise reach the grid.
            </p>
          </div>
        </div>
      </section>

      <footer>
        <h3>🌿 EcoPulse</h3>
        <p>Working toward a healthier planet. Built at DreamHacks 2026, Georgia Tech.</p>
      </footer>

      <EcoBot forecast={forecast} />
    </div>
  );
}
