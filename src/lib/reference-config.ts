import { EXERCISE_MODES } from './modes';
import { MODEL_ID, type ReferenceSet } from './pose-classifier';
export const MODEL_SHA256='5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1';
/** No synthetic poses are shipped as training evidence. Fill through the research workflow. */
export const REFERENCES=Object.fromEntries(EXERCISE_MODES.map(mode=>[mode,{
 version:`${mode}-v1.0.0`,status:'missing-reference-data',model:MODEL_ID,
 requiredLabels:['start','end','transition','wrong','invalid'],samples:[],
 physicalAndroidPassed:false,physicalIPhonePassed:false,exactTenRepPassed:false,invalidSequencesPassed:false,
}]));
export const TRAINING_SET:ReferenceSet={version:'four-modes-v1.0.0',model:MODEL_ID,source:'Not collected',license:'No training data distributed',rightsConfirmed:false,samples:[]};
// Keep promotion explicit and version-controlled. 3D is shadow evaluation only.
export const CLASSIFICATION_PROMOTED=false;
