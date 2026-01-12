import { Class } from '../types'

/**
 * NOTA: O status das turmas deve ser calculado baseado nos eventos e seus schedules,
 * não nas datas start_date/end_date da turma (que geralmente são NULL).
 * Use calculateClassDynamicInfo() de eventUtils.ts para obter o status correto.
 */

export function hasValidSchedule(classData: Class): boolean {
  return !!(
    classData.schedule && 
    Array.isArray(classData.schedule) && 
    classData.schedule.length > 0 &&
    classData.schedule.every(meeting => 
      meeting &&
      meeting['initial-time'] &&
      typeof meeting['initial-time'] === 'string' &&
      meeting['initial-time'].trim() !== '' &&
      meeting['end-time'] &&
      typeof meeting['end-time'] === 'string' &&
      meeting['end-time'].trim() !== ''
    )
  )
}