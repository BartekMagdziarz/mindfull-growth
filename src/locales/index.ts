import enCommon from './en/common.json'
import enAuth from './en/auth.json'
import enJournal from './en/journal.json'
import enChat from './en/chat.json'
import enHistory from './en/history.json'
import enEmotions from './en/emotions.json'
import enEmotionViews from './en/emotionViews.json'
import enDistortions from './en/distortions.json'
import enExercises from './en/exercises.json'
import enExerciseWizards from './en/exerciseWizards.json'
import enLifeAreas from './en/lifeAreas.json'
import enProfile from './en/profile.json'
import enErrors from './en/errors.json'
import enAssessmentsCommon from './en/assessments.common.json'
import enAssessmentsIpipBfm50 from './en/assessments.ipip-bfm50.json'
import enAssessmentsIpipNeo120 from './en/assessments.ipip-neo-120.json'
import enAssessmentsHexaco60 from './en/assessments.hexaco-60.json'
import enAssessmentsPvq40 from './en/assessments.pvq-40.json'
import enAssessmentsVlq from './en/assessments.vlq.json'

import plCommon from './pl/common.json'
import plAuth from './pl/auth.json'
import plJournal from './pl/journal.json'
import plChat from './pl/chat.json'
import plHistory from './pl/history.json'
import plEmotions from './pl/emotions.json'
import plEmotionViews from './pl/emotionViews.json'
import plDistortions from './pl/distortions.json'
import plExercises from './pl/exercises.json'
import plExerciseWizards from './pl/exerciseWizards.json'
import plLifeAreas from './pl/lifeAreas.json'
import plProfile from './pl/profile.json'
import plErrors from './pl/errors.json'
import plAssessmentsCommon from './pl/assessments.common.json'
import plAssessmentsIpipBfm50 from './pl/assessments.ipip-bfm50.json'
import plAssessmentsIpipNeo120 from './pl/assessments.ipip-neo-120.json'
import plAssessmentsHexaco60 from './pl/assessments.hexaco-60.json'
import plAssessmentsPvq40 from './pl/assessments.pvq-40.json'
import plAssessmentsVlq from './pl/assessments.vlq.json'

const enMessages = {
  common: enCommon,
  auth: enAuth,
  journal: enJournal,
  chat: enChat,
  history: enHistory,
  emotions: enEmotions,
  emotionViews: enEmotionViews,
  distortions: enDistortions,
  exercises: enExercises,
  exerciseWizards: enExerciseWizards,
  lifeAreas: enLifeAreas,
  profile: enProfile,
  errors: enErrors,
  assessments: {
    common: enAssessmentsCommon,
    ipipBfm50: enAssessmentsIpipBfm50,
    ipipNeo120: enAssessmentsIpipNeo120,
    hexaco60: enAssessmentsHexaco60,
    pvq40: enAssessmentsPvq40,
    vlq: enAssessmentsVlq,
  },
}

const plMessages = {
  common: plCommon,
  auth: plAuth,
  journal: plJournal,
  chat: plChat,
  history: plHistory,
  emotions: plEmotions,
  emotionViews: plEmotionViews,
  distortions: plDistortions,
  exercises: plExercises,
  exerciseWizards: plExerciseWizards,
  lifeAreas: plLifeAreas,
  profile: plProfile,
  errors: plErrors,
  assessments: {
    common: plAssessmentsCommon,
    ipipBfm50: plAssessmentsIpipBfm50,
    ipipNeo120: plAssessmentsIpipNeo120,
    hexaco60: plAssessmentsHexaco60,
    pvq40: plAssessmentsPvq40,
    vlq: plAssessmentsVlq,
  },
}

export const messages: Record<string, Record<string, unknown>> = {
  en: enMessages,
  pl: plMessages,
}
