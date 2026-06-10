import { useMetadataStore } from '@/store/workload/metadata'

/** 演示「创建服务」向导默认元数据（人脸识别场景） */
export const DEMO_CREATE_METADATA = {
  nameCn: '人脸识别服务',
  nameEn: 'face-recognition',
  version: 'v1',
  desc: '人脸识别在线推理服务',
  labelVersion: 'v1',
  annotationDescription: '人脸识别在线推理服务'
} as const

/** 演示创建应用时预填元数据、标签与注解 */
export function applyDemoCreateDefaults(): void {
  const metadataStore = useMetadataStore()

  metadataStore.updateMetadata({
    nameCn: DEMO_CREATE_METADATA.nameCn,
    nameEn: DEMO_CREATE_METADATA.nameEn,
    version: DEMO_CREATE_METADATA.version,
    desc: DEMO_CREATE_METADATA.desc
  })

  metadataStore.setLabels({
    version: DEMO_CREATE_METADATA.labelVersion
  })

  metadataStore.setAnnotations({
    description: DEMO_CREATE_METADATA.annotationDescription
  })
}
