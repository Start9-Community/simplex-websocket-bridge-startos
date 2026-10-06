import { VersionGraph } from '@start9labs/start-sdk'
import { current } from './current'
import { v_7_0_2_1 } from './v7.0.2_1'

export const versionGraph = VersionGraph.of({
  current,
  other: [v_7_0_2_1],
})
