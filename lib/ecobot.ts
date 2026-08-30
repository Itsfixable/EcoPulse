export interface EnvironmentalSnapshot {
  temperatureF: number;
  renewableShare: number;
  dieselSavedL: number;
  co2SavedKg: number;
  tankLowM3: number;
}

export function localEcoBotReply(question: string, data: EnvironmentalSnapshot): string {
  const query = question.toLowerCase();

  if (/(water|tank|desal)/.test(query)) {
    return `The freshwater tank is projected to stay above ${data.tankLowM3} m³. EcoPulse moves desalination into renewable-rich hours so water production does not force extra diesel use.`;
  }
  if (/(energy|electric|solar|wind|battery|diesel|generator)/.test(query)) {
    return `Renewables supply ${data.renewableShare}% of today's served energy. Compared with a fixed schedule, the plan avoids ${data.dieselSavedL} L of diesel and ${data.co2SavedKg} kg of CO₂.`;
  }
  if (/(heat|temperature|weather)/.test(query)) {
    return `Today's forecast high is ${data.temperatureF}°F. EcoPulse uses the weather forecast to anticipate solar and wind generation before choosing when flexible loads should run.`;
  }
  if (/(ocean|sea|coast|flood)/.test(query)) {
    return "Rising seas make coastal energy and water infrastructure more vulnerable. EcoPulse helps build resilience by reducing reliance on fuel deliveries and making better use of local renewable power.";
  }
  if (/(hello|hi|hey)/.test(query)) {
    return "Hi! I can explain today's energy plan, the freshwater tank, forecast conditions, or how EcoPulse reduces diesel use.";
  }

  return "Ask me about today's power plan, renewable energy, diesel use, the freshwater tank, weather, or coastal resilience.";
}
