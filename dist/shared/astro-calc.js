/*
  mecmûa — astrology calculation core.
  Tropical, geocentric, apparent positions via the Astronomy Engine library
  (window.Astronomy — see astronomy-engine.min.js). Equal-house system from
  the Ascendant. Astrocartography lines follow the standard rising/setting
  hour-angle construction (Jim Lewis's Astro*Carto*Graphy method).
*/
(function (global) {
  'use strict';

  var D2R = Math.PI / 180, R2D = 180 / Math.PI;

  function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function norm180(x) { x = norm360(x); return x > 180 ? x - 360 : x; }
  function atan2deg(y, x) { return norm360(Math.atan2(y, x) * R2D); }

  var SIGNS = [
    { name: 'Aries', glyph: '♈' }, { name: 'Taurus', glyph: '♉' },
    { name: 'Gemini', glyph: '♊' }, { name: 'Cancer', glyph: '♋' },
    { name: 'Leo', glyph: '♌' }, { name: 'Virgo', glyph: '♍' },
    { name: 'Libra', glyph: '♎' }, { name: 'Scorpio', glyph: '♏' },
    { name: 'Sagittarius', glyph: '♐' }, { name: 'Capricorn', glyph: '♑' },
    { name: 'Aquarius', glyph: '♒' }, { name: 'Pisces', glyph: '♓' }
  ];

  var BODIES = [
    { key: 'Sun', name: 'Sun', glyph: '☉' },
    { key: 'Moon', name: 'Moon', glyph: '☽' },
    { key: 'Mercury', name: 'Mercury', glyph: '☿' },
    { key: 'Venus', name: 'Venus', glyph: '♀' },
    { key: 'Mars', name: 'Mars', glyph: '♂' },
    { key: 'Jupiter', name: 'Jupiter', glyph: '♃' },
    { key: 'Saturn', name: 'Saturn', glyph: '♄' },
    { key: 'Uranus', name: 'Uranus', glyph: '♅' },
    { key: 'Neptune', name: 'Neptune', glyph: '♆' },
    { key: 'Pluto', name: 'Pluto', glyph: '♇' }
  ];

  var ASPECTS = [
    { name: 'Conjunction', angle: 0, orb: 8, style: 'neutral' },
    { name: 'Sextile', angle: 60, orb: 4, style: 'soft' },
    { name: 'Square', angle: 90, orb: 6, style: 'hard' },
    { name: 'Trine', angle: 120, orb: 6, style: 'soft' },
    { name: 'Opposition', angle: 180, orb: 8, style: 'hard' }
  ];

  function signOf(lonDeg) {
    var l = norm360(lonDeg);
    var idx = Math.floor(l / 30);
    return { index: idx, sign: SIGNS[idx], degInSign: l - idx * 30 };
  }

  // Ecliptic (lon,lat, of-date) -> equatorial (RA,Dec, of-date), given true obliquity eps (radians).
  function eclToEquatorial(lonDeg, latDeg, eps) {
    var lon = lonDeg * D2R, lat = latDeg * D2R;
    var x = Math.cos(lat) * Math.cos(lon);
    var y = Math.cos(lat) * Math.sin(lon) * Math.cos(eps) - Math.sin(lat) * Math.sin(eps);
    var z = Math.cos(lat) * Math.sin(lon) * Math.sin(eps) + Math.sin(lat) * Math.cos(eps);
    return { ra: atan2deg(y, x), dec: Math.asin(z) * R2D };
  }

  function bodyEcliptic(Astronomy, key, time) {
    if (key === 'Sun') {
      var sp = Astronomy.SunPosition(time);
      return { lon: sp.elon, lat: sp.elat };
    }
    if (key === 'Moon') {
      var m = Astronomy.EclipticGeoMoon(time);
      return { lon: m.lon, lat: m.lat };
    }
    var vec = Astronomy.GeoVector(Astronomy.Body[key], time, true);
    var ecl = Astronomy.Ecliptic(vec);
    return { lon: ecl.elon, lat: ecl.elat };
  }

  /**
   * @param {object} input
   *   year, month, day, hour, minute — civil birth date/time (local, as typed)
   *   utcOffsetHours — the birthplace's standard UTC offset as usually written,
   *     e.g. +3 for Istanbul, -5 for New York (EST). UTC = local time − offset.
   *   lat — geographic latitude, degrees north positive
   *   lonEast — geographic longitude, degrees east positive
   *   unknownTime — if true, houses/Asc/MC are omitted (birth time not known)
   */
  function computeChart(input) {
    var Astronomy = global.Astronomy;
    var utcMs = Date.UTC(
      input.year, input.month - 1, input.day,
      input.hour, input.minute, 0
    ) - input.utcOffsetHours * 3600000;
    var date = new Date(utcMs);
    var time = Astronomy.MakeTime(date);

    var eps = Astronomy.e_tilt(time).tobl * D2R;
    var gstHours = Astronomy.SiderealTime(time);
    var gstDeg = norm360(gstHours * 15);

    var laterTime = Astronomy.MakeTime(new Date(utcMs + 6 * 3600000));

    var planets = BODIES.map(function (b) {
      var ecl = bodyEcliptic(Astronomy, b.key, time);
      var eq = eclToEquatorial(ecl.lon, ecl.lat, eps);
      var later = bodyEcliptic(Astronomy, b.key, laterTime);
      var motion = norm180(later.lon - ecl.lon);
      var s = signOf(ecl.lon);
      return {
        key: b.key, name: b.name, glyph: b.glyph,
        lon: norm360(ecl.lon), lat: ecl.lat,
        ra: eq.ra, dec: eq.dec,
        retrograde: motion < 0,
        sign: s.sign, degInSign: s.degInSign
      };
    });

    var result = {
      date: date, gstDeg: gstDeg, eps: eps,
      lat: input.lat, lonEast: input.lonEast,
      planets: planets,
      unknownTime: !!input.unknownTime
    };

    if (!input.unknownTime && typeof input.lat === 'number' && typeof input.lonEast === 'number') {
      var lstDeg = norm360(gstDeg + input.lonEast);
      var lst = lstDeg * D2R, phi = input.lat * D2R;

      var mc = atan2deg(Math.sin(lst), Math.cos(lst) * Math.cos(eps));
      var asc = atan2deg(
        Math.cos(lst),
        -(Math.sin(eps) * Math.tan(phi) + Math.cos(eps) * Math.sin(lst))
      );
      var dsc = norm360(asc + 180);
      var ic = norm360(mc + 180);

      var houses = [];
      for (var i = 0; i < 12; i++) houses.push(norm360(asc + 30 * i));

      planets.forEach(function (p) {
        var rel = norm360(p.lon - asc);
        p.house = Math.floor(rel / 30) + 1;
      });

      result.asc = asc; result.mc = mc; result.dsc = dsc; result.ic = ic;
      result.houses = houses;
    }

    var aspects = [];
    for (var i = 0; i < planets.length; i++) {
      for (var j = i + 1; j < planets.length; j++) {
        var diff = Math.abs(norm180(planets[i].lon - planets[j].lon));
        for (var k = 0; k < ASPECTS.length; k++) {
          var a = ASPECTS[k];
          if (Math.abs(diff - a.angle) <= a.orb) {
            aspects.push({
              a: planets[i].key, b: planets[j].key,
              type: a.name, style: a.style,
              angle: diff, orb: Math.abs(diff - a.angle)
            });
            break;
          }
        }
      }
    }
    result.aspects = aspects;

    return result;
  }

  /**
   * Astrocartography lines for a fixed birth instant (gstDeg, planet RA/Dec already
   * computed by computeChart). Longitudes are degrees east, -180..180.
   * MC/IC are single longitudes (vertical meridian lines).
   * ASC/DC are polylines of {lat, lon}, split into segments where the line
   * wraps around +/-180 or where the body is circumpolar at that latitude
   * (no rise/set, so no line exists there).
   */
  function computeAstrocartography(chart) {
    var gstDeg = chart.gstDeg;
    var lines = {};

    chart.planets.forEach(function (p) {
      var mcLon = norm180(p.ra - gstDeg);
      var icLon = norm180(p.ra + 180 - gstDeg);

      var ascSegs = [[]], dscSegs = [[]];
      var decRad = p.dec * D2R;
      var step = 0.5, latMax = 79.5;
      var prevAscLon = null, prevDscLon = null;

      for (var lat = -latMax; lat <= latMax; lat += step) {
        var phi = lat * D2R;
        var cosH = -Math.tan(phi) * Math.tan(decRad);
        if (cosH < -1 || cosH > 1) {
          if (ascSegs[ascSegs.length - 1].length) ascSegs.push([]);
          if (dscSegs[dscSegs.length - 1].length) dscSegs.push([]);
          prevAscLon = null; prevDscLon = null;
          continue;
        }
        var H = Math.acos(cosH) * R2D;
        // LST = RA + H (rise = negative branch, set = positive branch); lonEast = LST - GST
        var lstRise = p.ra - H;
        var lstSet = p.ra + H;
        var lonAsc = norm180(lstRise - gstDeg);
        var lonDsc = norm180(lstSet - gstDeg);

        if (prevAscLon !== null && Math.abs(lonAsc - prevAscLon) > 90) ascSegs.push([]);
        if (prevDscLon !== null && Math.abs(lonDsc - prevDscLon) > 90) dscSegs.push([]);

        ascSegs[ascSegs.length - 1].push({ lat: lat, lon: lonAsc });
        dscSegs[dscSegs.length - 1].push({ lat: lat, lon: lonDsc });
        prevAscLon = lonAsc; prevDscLon = lonDsc;
      }

      lines[p.key] = {
        mcLon: mcLon, icLon: icLon,
        asc: ascSegs.filter(function (s) { return s.length > 1; }),
        dsc: dscSegs.filter(function (s) { return s.length > 1; })
      };
    });

    return lines;
  }

  global.MecmuaAstro = {
    SIGNS: SIGNS, BODIES: BODIES, ASPECTS: ASPECTS,
    norm360: norm360, norm180: norm180,
    computeChart: computeChart,
    computeAstrocartography: computeAstrocartography
  };
})(typeof window !== 'undefined' ? window : globalThis);
