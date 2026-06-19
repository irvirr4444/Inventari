export const ERR_TRANSFER_NEEDS_DESTINATION = 'Transfer kerkon destinacion.'
export const ERR_TRANSFER_SAME_COUNTRY = 'Destinacioni i transferit duhet te jete ndryshe nga burimi.'
export const ERR_BATCH_NOT_FOUND = 'Veprimi nuk u gjet.'
export const ERR_BATCH_CREATE_FAILED = 'Nuk u krijua batch i veprimit.'
export const ERR_NO_UPDATE_FIELDS = 'Asnje fushe per perditesim.'
export const ERR_PRODUCT_LINE_NOT_FOUND = 'Rreshti i produktit nuk u gjet.'
export const ERR_DUPLICATE_PRODUCT_IN_ACTION = 'Produkti ekziston tashme ne kete veprim.'
export const ERR_LAST_PRODUCT_LINE = 'Duhet te mbetet te pakten nje produkt ne veprim.'
export const ERR_MIRROR_COUNTRY_CHANGE = 'Nuk mund te ndryshohet shteti per Dalje te pasqyruar ne Shqiperi.'
export const ERR_NO_ACTIONS_IN_PERIOD = 'Nuk ka veprime per kete periudhe.'

export function errInsufficientStock(productDisplay: string): string {
  return `Nuk ka gjendje te mjaftueshme per ${productDisplay}.`
}
