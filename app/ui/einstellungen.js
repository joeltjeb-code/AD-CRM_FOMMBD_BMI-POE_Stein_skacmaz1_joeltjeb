export function rendereEinstellungen(container, settings, { onSpeichern }) {
  container.innerHTML = `
    <fieldset>
      <legend>Einstellungen</legend>
      <label>Heimatadresse <input name="heimatName" value="${settings.heimat.name}"></label>
      <label>BEV-Fahrzeug <input type="checkbox" name="bev" ${settings.bev ? 'checked' : ''}></label>
      <label>Max. Fahrzeit zum ersten Termin (min)
        <input type="number" name="maxFahrt" value="${settings.praferenzen.maxFahrtErsterTerminMin}" min="10" max="120"></label>
      <button type="button" name="speichern">Speichern & neu planen</button>
    </fieldset>`;
  container.querySelector('[name=speichern]').addEventListener('click', () => {
    const neu = {
      ...settings,
      heimat: { ...settings.heimat, name: container.querySelector('[name=heimatName]').value },
      bev: container.querySelector('[name=bev]').checked,
      praferenzen: {
        ...settings.praferenzen,
        maxFahrtErsterTerminMin: Number(container.querySelector('[name=maxFahrt]').value),
      },
    };
    onSpeichern(neu);
  });
}
