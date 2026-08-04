export const MAX_COFFEE_UNITS_PER_ORDER = 6

function normalizeLocationValue(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function isCoffeeForOrderLimit(product) {
  const code = String(product?.codigo || '').trim().toUpperCase()
  const category = normalizeText(product?.categoria)
  const name = normalizeText(product?.nombre)

  const isAccessory =
    code.startsWith('ACC-') ||
    category.includes('accesor') ||
    name.includes('compresa') ||
    name.includes('prensa') ||
    name.includes('cafetera') ||
    name.includes('moka')

  return !isAccessory
}

export function countCoffeeUnits(items) {
  const safeItems = Array.isArray(items) ? items : []
  return safeItems.reduce((total, item) => {
    if (!isCoffeeForOrderLimit(item)) return total
    return total + (Number(item.cantidad) || 0)
  }, 0)
}

export function getDeliveryQuote(
  formaEntrega,
  provinciaEntrega,
  ciudadEntrega,
  sectorEntrega,
  direccionEntrega,
) {
  if (formaEntrega !== 'ENTREGA_DOMICILIO') {
    return {
      fee: 0,
      distanceLabel: 'Sin envío',
    }
  }

  const provincia = normalizeLocationValue(provinciaEntrega)
  const ciudad = normalizeLocationValue(ciudadEntrega)
  const sector = normalizeLocationValue(sectorEntrega)
  const direccion = normalizeLocationValue(direccionEntrega)
  const locationText = `${provincia} ${ciudad} ${sector} ${direccion}`.trim()

  if (!locationText) {
    return {
      fee: 0,
      distanceLabel: 'Completa la ubicación para calcular',
    }
  }

  if (locationText.includes('zaruma')) {
    return {
      fee: 2.5,
      distanceLabel: 'Cerca de Zaruma',
    }
  }

  if (provincia.includes('el oro') || locationText.includes('el oro')) {
    if (
      locationText.includes('portovelo') ||
      locationText.includes('pinas') ||
      locationText.includes('atahualpa')
    ) {
      return {
        fee: 3.5,
        distanceLabel: 'Distancia media desde Zaruma',
      }
    }

    if (
      locationText.includes('machala') ||
      locationText.includes('pasaje') ||
      locationText.includes('santa rosa') ||
      locationText.includes('huaquillas') ||
      locationText.includes('arenillas')
    ) {
      return {
        fee: 5,
        distanceLabel: 'Lejos dentro de El Oro',
      }
    }

    return {
      fee: 4.5,
      distanceLabel: 'Distancia media dentro de El Oro',
    }
  }

  if (
    provincia.includes('loja') ||
    provincia.includes('azuay') ||
    locationText.includes('loja') ||
    locationText.includes('azuay')
  ) {
    return {
      fee: 6.5,
      distanceLabel: 'Provincia vecina de Zaruma',
    }
  }

  if (
    provincia.includes('zamora chinchipe') ||
    provincia.includes('canar') ||
    locationText.includes('zamora chinchipe') ||
    locationText.includes('canar')
  ) {
    return {
      fee: 7.5,
      distanceLabel: 'Provincia más lejana',
    }
  }

  return {
    fee: 9.5,
    distanceLabel: 'Envío de larga distancia',
  }
}
