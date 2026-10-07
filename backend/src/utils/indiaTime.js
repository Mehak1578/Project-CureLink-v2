const INDIA_TIME_ZONE = 'Asia/Kolkata';

const getTimeZoneOffset = (date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: INDIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts
    .filter(({ type }) => type !== 'literal')
    .map(({ type, value }) => [type, Number(value)]));
  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );
  return asUtc - date.getTime();
};

const getIndiaDayBounds = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  if (![year, month, day].every(Number.isInteger)) return null;

  // Convert an India wall-clock midnight to its UTC instant without assuming
  // the server's local timezone.
  const utcMidnight = Date.UTC(year, month - 1, day);
  const offset = getTimeZoneOffset(new Date(utcMidnight));
  const start = new Date(utcMidnight - offset);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
};

const indiaDateTimeToDate = (dateString, timeString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  if (![year, month, day, hours, minutes].every(Number.isInteger)) return null;

  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes);
  const offset = getTimeZoneOffset(new Date(utcGuess));
  return new Date(utcGuess - offset);
};

module.exports = {
  INDIA_TIME_ZONE,
  getIndiaDayBounds,
  indiaDateTimeToDate,
};
