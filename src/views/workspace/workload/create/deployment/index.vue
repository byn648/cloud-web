<template>
  <div class="deployment-create-wizard">
    <!-- 步骤卡片 -->
    <WorkloadStepsCard
      :steps="steps"
      :current-step="currentStep"
      :mode="mode"
      :namespace="currentNamespace"
      :resource-type="isDemoCreateRoute(route) ? '' : 'Deployment'"
      :title-override="isDemoCreateRoute(route) ? '添加服务' : undefined"
      v-model:edit-mode="editMode"
      :is-valid="isValid"
      :creating="creating"
      @back="handleBack"
      @submit="handleSave"
      @step-click="goToStep"
    />

    <!-- 主内容卡片 -->
    <ElCard class="wizard-content-card" shadow="hover">
      <template v-if="editMode === 'form'">
        <!-- 步骤内容 -->
        <Transition name="step" mode="out-in">
          <component
            :is="currentStepComponent"
            :key="`${currentStep}-${componentKey}`"
            :mode="mode"
            ref="currentStepRef"
            @validate="handleValidation"
            @next="goToNextStep"
          />
        </Transition>
      </template>

      <!-- YAML模式 -->
      <template v-else>
        <YamlEditor
          v-model="yamlContent"
          :filename="`${metadataStore.metadata.nameEn || 'deployment'}.yaml`"
          :readonly="false"
          height="600px"
          @change="handleYamlChange"
          @save="handleYamlSave"
        />
      </template>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import {
    ref,
    computed,
    watch,
    provide,
    onMounted,
    onBeforeUnmount,
    shallowRef,
    nextTick
  } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import YamlEditor from '@/components/yaml-editor-pro/index.vue'
  import yaml from 'js-yaml'
  import WorkloadStepsCard from '../common/components/WorkloadStepsCard.vue'

  // 导入 Store
  import {
    useMetadataStore,
    useContainersStore,
    useVolumesStore,
    useSchedulingStore,
    useAdvancedStore,
    resetAllWorkloadStores
  } from '@/store/workload'
  import { useDeploymentStore } from '@/store/workload/deployment'

  // 导入 API
  import { ResourceType } from '@/api/workload'

  // 导入工具函数
  import {
    validateRouteParams,
    initWorkloadByMode,
    isFieldEditable,
    getModeText,
    ensureNamespace,
    ensureRequiredLabelsInResource,
    type RouteParams,
    type WorkloadMode
  } from '../common/utils/modeHandler'

  // 导入统一提交处理
  import { submitWorkload, submitWorkloadFromYaml } from '../common/utils/submitHandler'
  import {
    finishCreateAndNavigate,
    isDemoCreateRoute,
    leaveWorkloadWizard
  } from '../../../application-demo/create/demoWorkloadBridge'

  // 步骤组件
  import MetadataStep from '../common/components/MetadataStep.vue'
  import ReplicasStep from './components/ReplicasStep.vue'
  import ContainersStep from '../common/components/ContainersStep.vue'
  import VolumesStep from '../common/components/VolumesStep.vue'
  import SchedulingStep from '../common/components/SchedulingStep.vue'
  import AdvancedStep from '../common/components/AdvancedStep.vue'
  import ReviewStep from './components/ReviewStep.vue'

  // 初始化 Store
  const metadataStore = useMetadataStore()
  const containersStore = useContainersStore()
  const volumesStore = useVolumesStore()
  const schedulingStore = useSchedulingStore()
  const advancedStore = useAdvancedStore()
  const deploymentStore = useDeploymentStore()

  const router = useRouter()
  const route = useRoute()

  // 路由参数
  const routeParams = ref<RouteParams | null>(null)
  const mode = computed(() => routeParams.value?.mode || 'createApp')
  const resourceClusterId = computed(() => routeParams.value?.resourceClusterId || 0)
  const clusterUuid = computed(() => routeParams.value?.clusterUuid || '')
  const workspaceId = computed(() => routeParams.value?.workspaceId || 0)
  const currentNamespace = computed(() => routeParams.value?.namespace || 'default')
  const applicationId = computed(() => routeParams.value?.applicationId)
  const applicationVersionId = computed(() => routeParams.value?.applicationVersionId)
  const appProjectId = computed(() => routeParams.value?.appProjectId || 0)
  // 编辑模式
  const editMode = ref<'form' | 'yaml'>('form')

  // 当前步骤
  const currentStep = ref(0)
  const currentStepRef = ref<any>(null)

  // 创建状态
  const creating = ref(false)

  // 数据是否已修改
  const hasUnsavedChanges = ref(false)

  // 组件key，用于强制刷新
  const componentKey = ref(0)

  // 步骤配置接口
  interface StepConfig {
    id: string
    title: string
    description: string
    component: any
    hasError: boolean
    validated: boolean
    touched: boolean
    required: boolean
  }

  // 验证结果接口
  interface ValidationResult {
    valid: boolean
    errors: string[]
    warnings?: string[]
  }

  type StepPatch = Partial<Pick<StepConfig, 'validated' | 'hasError' | 'touched'>>

  function applyStepState(stepList: StepConfig[], id: string, patch: StepPatch) {
    const step = stepList.find((s) => s.id === id)
    if (step) Object.assign(step, patch)
  }

  function createWizardSteps(includeAdvanced: boolean): StepConfig[] {
    const all: StepConfig[] = [
      {
        id: 'metadata',
        title: '元数据配置',
        description: 'Deployment名称和标签',
        component: MetadataStep,
        hasError: true,
        validated: false,
        touched: false,
        required: true
      },
      {
        id: 'replicas',
        title: '实例配置',
        description: includeAdvanced ? '实例数量和更新策略' : '配置实例数量',
        component: ReplicasStep,
        hasError: false,
        validated: true,
        touched: false,
        required: true
      },
      {
        id: 'volumes',
        title: '存储配置',
        description: '配置存储卷（供容器挂载）',
        component: VolumesStep,
        hasError: false,
        validated: true,
        touched: false,
        required: false
      },
      {
        id: 'containers',
        title: '容器配置',
        description: '配置容器镜像和资源',
        component: ContainersStep,
        hasError: true,
        validated: false,
        touched: false,
        required: true
      },
      {
        id: 'scheduling',
        title: '调度策略',
        description: '节点选择和亲和性',
        component: SchedulingStep,
        hasError: false,
        validated: true,
        touched: false,
        required: false
      },
      {
        id: 'advanced',
        title: '高级配置',
        description: '安全上下文和网络',
        component: AdvancedStep,
        hasError: false,
        validated: true,
        touched: false,
        required: false
      },
      {
        id: 'review',
        title: '确认配置',
        description: '检查并确认',
        component: ReviewStep,
        hasError: false,
        validated: true,
        touched: false,
        required: false
      }
    ]
    return includeAdvanced ? all : all.filter((s) => s.id !== 'advanced')
  }

  const steps = shallowRef(createWizardSteps(!isDemoCreateRoute(route)))
  // 当前步骤组件
  const currentStepComponent = computed(() => {
    return steps.value[currentStep.value].component
  })

  // 整体是否有效
  const isValid = computed(() => {
    return steps.value
      .filter((step) => step.required)
      .every((step) => step.validated && !step.hasError)
  })

  // YAML内容
  const yamlContent = ref('')

  // 字段是否可编辑
  const canEditField = (field: 'nameCn' | 'nameEn' | 'version' | 'desc') => {
    return isFieldEditable(mode.value, field)
  }

  // 提供给子组件
  provide('namespace', currentNamespace)
  provide('resourceClusterId', resourceClusterId)
  provide('clusterUuid', clusterUuid)
  provide('workspaceId', workspaceId)
  provide('mode', mode)
  provide('canEditField', canEditField)
  provide('appProjectId', appProjectId)
  // ==================== 验证逻辑 ====================

  // ⭐ 新增：YAML 导入后验证所有步骤
  const validateAllStepsAfterYamlImport = async () => {
    const currentSteps = [...steps.value]
    let allValid = true
    const validationErrors: string[] = []

    // 1. 验证元数据步骤
    try {
      const metadataValid =
        metadataStore.metadata.nameCn &&
        metadataStore.metadata.nameEn &&
        metadataStore.metadata.version &&
        metadataStore.metadata.resourceName
      applyStepState(currentSteps, 'metadata', {
        validated: metadataValid,
        hasError: !metadataValid,
        touched: true
      })
      if (!metadataValid) {
        validationErrors.push('元数据配置不完整')
        allValid = false
      }
    } catch (error) {
      console.error('元数据验证失败:', error)
    }

    // 2. 验证副本配置
    try {
      const replicasValid = deploymentStore.replicas > 0
      applyStepState(currentSteps, 'replicas', {
        validated: replicasValid,
        hasError: !replicasValid,
        touched: true
      })
      if (!replicasValid) {
        validationErrors.push('实例数量必须大于0')
        allValid = false
      }
    } catch (error) {
      console.error('副本验证失败:', error)
    }

    // 3. 存储（非必填）
    applyStepState(currentSteps, 'volumes', { validated: true, hasError: false, touched: true })

    // 4. 验证容器配置
    try {
      const containersResult = containersStore.validate()
      applyStepState(currentSteps, 'containers', {
        validated: containersResult.valid,
        hasError: !containersResult.valid,
        touched: true
      })

      if (!containersResult.valid) {
        validationErrors.push(...containersResult.errors)
        allValid = false
      }
    } catch (error) {
      console.error('容器验证失败:', error)
      applyStepState(currentSteps, 'containers', {
        validated: false,
        hasError: true,
        touched: true
      })
      validationErrors.push('容器配置验证异常')
      allValid = false
    }

    // 5. 其他非必填步骤默认通过
    ;['scheduling', 'advanced', 'review'].forEach((id) => {
      applyStepState(currentSteps, id, { validated: true, hasError: false, touched: true })
    })

    steps.value = currentSteps

    // 显示验证结果
    if (allValid) {
    } else {
      // 显示第一个错误
      if (validationErrors.length > 0) {
        ElMessage.error({
          message: `配置验证：${validationErrors[0]}`,
          duration: 4000,
          showClose: true
        })
      }
    }

    return allValid
  }

  // 处理验证
  const handleValidation = (result: ValidationResult) => {
    const currentSteps = [...steps.value]
    const step = currentSteps[currentStep.value]

    step.validated = result.valid
    step.hasError = result.errors.length > 0
    step.touched = true

    steps.value = currentSteps

    if (step.touched) {
      hasUnsavedChanges.value = true
    }
  }

  // 验证当前步骤
  const validateCurrentStep = async (): Promise<boolean> => {
    const step = steps.value[currentStep.value]

    if (!currentStepRef.value?.validate) {
      if (!step.required) {
        const currentSteps = [...steps.value]
        currentSteps[currentStep.value].validated = true
        currentSteps[currentStep.value].hasError = false
        steps.value = currentSteps
        return true
      }

      return false
    }

    try {
      const result = await currentStepRef.value.validate()

      if (typeof result === 'boolean') {
        const validationResult = {
          valid: result,
          errors: result ? [] : ['验证失败']
        }
        handleValidation(validationResult)
        return result
      }

      handleValidation(result)
      return result.valid
    } catch (error) {
      console.error(`❌ 步骤 ${step.title} 验证异常:`, error)
      handleValidation({ valid: false, errors: ['验证过程发生错误'] })
      return false
    }
  }

  // ==================== 步骤导航 ====================

  // 跳转到指定步骤
  const goToStep = async (index: number) => {
    // 验证当前步骤
    if (currentStep.value !== index) {
      await validateCurrentStep()
    }

    const currentSteps = [...steps.value]
    currentSteps[currentStep.value].touched = true
    steps.value = currentSteps

    currentStep.value = index
  }

  const goToNextStep = async () => {
    const valid = await validateCurrentStep()
    if (!valid) return

    const currentSteps = [...steps.value]
    currentSteps[currentStep.value].touched = true
    steps.value = currentSteps

    currentStep.value = Math.min(currentStep.value + 1, steps.value.length - 1)
  }

  // ==================== 数据生成 ====================

  // 生成完整的 Deployment 对象
  const generateDeploymentObject = () => {
    const { metadata, namespace } = metadataStore
    const { nameEn, version, resourceName, nameCn, desc, labels, annotations } = metadata

    // 生成完整的标签
    const finalLabels = {
      app: nameEn,
      version: version,
      ...labels
    }

    // 生成完整的注解
    const finalAnnotations = {
      'ikubeops.com/project-name': nameCn,
      'created-by': 'kube-nova',
      ...(desc ? { description: desc } : {}),
      ...annotations,
      ...schedulingStore.getPodTemplateAnnotations()
    }

    // 获取容器配置
    const containerConfig = containersStore.toK8sFormat()

    // 获取调度配置
    const schedulingSpec = schedulingStore.toK8sFormat()

    // 获取高级配置
    const advancedSpec = advancedStore.toK8sFormat()

    // 获取存储卷
    const volumes = volumesStore.volumes.length > 0 ? volumesStore.volumes : undefined

    // 获取 Deployment 配置
    const deploymentSpec = deploymentStore.toK8sFormat()

    // 构建 Pod Spec
    const podSpec: any = {
      containers: containerConfig.containers,
      ...(containerConfig.initContainers && { initContainers: containerConfig.initContainers }),
      ...(volumes && volumes.length > 0 && { volumes }),
      ...advancedSpec,
      ...schedulingSpec
    }

    // 构建 Deployment
    const deployment: any = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: resourceName,
        namespace: namespace,
        labels: finalLabels,
        annotations: finalAnnotations
      },
      spec: {
        ...deploymentSpec,
        selector: {
          matchLabels: {
            app: nameEn,
            version: version
          }
        },
        template: {
          metadata: {
            labels: finalLabels,
            annotations: finalAnnotations
          },
          spec: podSpec
        }
      }
    }

    return deployment
  }

  // ==================== 保存逻辑 ====================

  function resolveDeploymentScheduleTarget() {
    const rlPlan =
      schedulingStore.nodeSchedulingMode === 'auto'
        ? schedulingStore.rlSchedulePlan
        : null
    const targetProjectClusterId =
      rlPlan?.targetProjectClusterId || rlPlan?.targetCluster?.projectClusterId
    const targetClusterUuid = rlPlan?.targetCluster?.uuid

    return {
      rlPlan,
      resourceClusterId: targetProjectClusterId || resourceClusterId.value,
      clusterUuid: targetClusterUuid || clusterUuid.value,
      workspaceId: workspaceId.value,
      schedulePlanId: rlPlan?.planId,
      targetClusterUuid,
      schedulePlanJson: rlPlan ? JSON.stringify(rlPlan) : undefined
    }
  }

  // 表单模式保存
  const handleSave = async () => {
    // 验证所有必填步骤
    const requiredSteps = steps.value.filter((s) => s.required)
    const allValid = requiredSteps.every((s) => s.validated && !s.hasError)

    if (!allValid) {
      return
    }

    creating.value = true

    try {
      // 生成 Deployment 对象
      const deployment = generateDeploymentObject()

      // 确保 namespace 和标签正确
      ensureNamespace(deployment, currentNamespace.value)
      ensureRequiredLabelsInResource(
        deployment,
        metadataStore.metadata.nameEn,
        metadataStore.metadata.version
      )

      // 确保 metadata.name 与 resourceName 一致
      deployment.metadata.name = metadataStore.metadata.resourceName

      // 生成YAML字符串
      const yamlStr = yaml.dump(deployment, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      })
      const scheduleTarget = resolveDeploymentScheduleTarget()

      // 调用统一提交函数
      const result = await submitWorkload({
        mode: mode.value,
        resourceType: ResourceType.DEPLOYMENT,
        resourceClusterId: scheduleTarget.resourceClusterId,
        clusterUuid: scheduleTarget.clusterUuid,
        workspaceId: scheduleTarget.workspaceId,
        namespace: currentNamespace.value,
        nameCn: metadataStore.metadata.nameCn,
        resourceName: metadataStore.metadata.resourceName,
        nameEn: metadataStore.metadata.nameEn,
        version: metadataStore.metadata.version,
        description: metadataStore.metadata.desc,
        resourceYamlStr: yamlStr,
        applicationId: applicationId.value,
        applicationVersionId: applicationVersionId.value,
        schedulePlanId: scheduleTarget.schedulePlanId,
        targetClusterUuid: scheduleTarget.targetClusterUuid,
        schedulePlanJson: scheduleTarget.schedulePlanJson,
        demo: isDemoCreateRoute(route)
      })

      finishCreateAndNavigate(router, route, result, clearAllData, () => navigateToList(), {
        resourceClusterId: resourceClusterId.value,
        workspaceId: workspaceId.value
      })
    } finally {
      creating.value = false
    }
  }

  // YAML模式保存
  const handleYamlSave = async () => {
    creating.value = true

    try {
      // 先解析 YAML 获取 resourceName
      let resourceNameFromYaml = ''
      try {
        const parsedDeployment = yaml.load(yamlContent.value) as any
        resourceNameFromYaml = parsedDeployment?.metadata?.name || ''
      } catch (error) {
        console.error('解析 YAML 失败:', error)
      }

      const scheduleTarget = resolveDeploymentScheduleTarget()
      const result = await submitWorkloadFromYaml(
        {
          mode: mode.value,
          resourceType: ResourceType.DEPLOYMENT,
          resourceClusterId: scheduleTarget.resourceClusterId,
          clusterUuid: scheduleTarget.clusterUuid,
          workspaceId: scheduleTarget.workspaceId,
          namespace: currentNamespace.value,
          applicationId: applicationId.value,
          applicationVersionId: applicationVersionId.value,
          schedulePlanId: scheduleTarget.schedulePlanId,
          targetClusterUuid: scheduleTarget.targetClusterUuid,
          schedulePlanJson: scheduleTarget.schedulePlanJson,
          demo: isDemoCreateRoute(route)
        },
        yamlContent.value,
        {
          nameCn: metadataStore.metadata.nameCn,
          resourceName: resourceNameFromYaml || metadataStore.metadata.resourceName,
          nameEn: metadataStore.metadata.nameEn,
          version: metadataStore.metadata.version,
          desc: metadataStore.metadata.desc
        }
      )

      finishCreateAndNavigate(router, route, result, clearAllData, () => navigateToList(), {
        resourceClusterId: resourceClusterId.value,
        workspaceId: workspaceId.value
      })
    } finally {
      creating.value = false
    }
  }

  // YAML变化处理
  const handleYamlChange = (value: string) => {
    yamlContent.value = value
    hasUnsavedChanges.value = true
  }

  // ==================== 页面导航 ====================

  // 返回
  const handleBack = async () => {
    await confirmExit(() => {
      leaveWorkloadWizard(router, route, () => {
        router.back()
      })
    })
  }

  // 导航到列表页
  const navigateToList = (
    target = {
      resourceClusterId: resourceClusterId.value,
      clusterUuid: clusterUuid.value,
      workspaceId: workspaceId.value
    }
  ) => {
    router.push({
      name: 'WorkspaceApp',
      query: {
        resourceClusterId: target.resourceClusterId,
        clusterUuid: target.clusterUuid,
        workspaceId: target.workspaceId,
        namespace: currentNamespace.value
      }
    })
  }

  // 退出确认
  const confirmExit = async (callback: () => void) => {
    const message = hasUnsavedChanges.value
      ? '您有未保存的更改，确定要离开吗？所有未保存的配置将丢失。'
      : '确定要离开当前页面吗？'

    try {
      await ElMessageBox.confirm(message, '确认离开', {
        confirmButtonText: '确定离开',
        cancelButtonText: '继续编辑',
        type: 'warning',
        distinguishCancelAndClose: true,
        beforeClose: (action, instance, done) => {
          if (action === 'confirm') {
            clearAllData()
            done()
          } else {
            done()
          }
        }
      })
      window.removeEventListener('beforeunload', handleBeforeUnload)
      callback()
    } catch {
      // 用户取消
    }
  }

  // 清理所有数据
  const clearAllData = () => {
    resetAllWorkloadStores()
    deploymentStore.reset()

    hasUnsavedChanges.value = false
    currentStep.value = 0
    editMode.value = 'form'
    yamlContent.value = ''

    steps.value.forEach((step) => {
      step.touched = false
      if (step.required) {
        step.hasError = true
        step.validated = false
      } else {
        step.hasError = false
        step.validated = true
      }
    })
  }

  // 处理页面离开前的确认
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges.value) {
      e.preventDefault()
      e.returnValue = '您有未保存的更改，确定要离开吗？'
    }
  }

  // ==================== 监听器 ====================

  // ========== 修复后的 YAML 切换逻辑 ==========
  // 替换 index.vue 中 watch(editMode, ...) 的 else if 分支

  watch(editMode, async (newMode, oldMode) => {
    if (newMode === 'yaml') {
      // 切换到 YAML 模式：从 store 生成 YAML
      const deployment = generateDeploymentObject()
      yamlContent.value = yaml.dump(deployment, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      })
    } else if (newMode === 'form' && oldMode === 'yaml') {
      // 从 YAML 模式切换回表单模式
      if (yamlContent.value && yamlContent.value.trim()) {
        try {
          // ⭐ 验证 YAML 内容
          const documents = yaml.loadAll(yamlContent.value)

          if (documents.length === 0) {
            ElMessage.error('YAML 内容为空')
            editMode.value = 'yaml'
            return
          }

          if (documents.length > 1) {
            ElMessage.error({
              message: `检测到 ${documents.length} 个 YAML 文档，Deployment 页面只能包含一个 Deployment 类型的 YAML`,
              duration: 5000,
              showClose: true
            })
            editMode.value = 'yaml'
            return
          }

          const parsedDeployment = documents[0] as any

          if (!parsedDeployment || !parsedDeployment.kind) {
            ElMessage.error('YAML 格式不正确')
            editMode.value = 'yaml'
            return
          }

          if (parsedDeployment.kind !== 'Deployment') {
            ElMessage.error({
              message: `当前页面只能处理 Deployment 类型的 YAML，但检测到 kind: ${parsedDeployment.kind}`,
              duration: 5000,
              showClose: true
            })
            editMode.value = 'yaml'
            return
          }

          // ⭐⭐⭐ 关键修复：先从 YAML 中提取元数据 ⭐⭐⭐
          const yamlMetadata = parsedDeployment.metadata || {}
          const yamlLabels = yamlMetadata.labels || {}
          const yamlAnnotations = yamlMetadata.annotations || {}
          const yamlResourceName = parsedDeployment.metadata?.name || ''
          // 检查 resourceName 是否为空
          if (!yamlResourceName) {
            ElMessage.error({
              message: '后端返回的 YAML 缺少 metadata.name 字段，请检查后端代码',
              duration: 5000,
              showClose: true
            })
            setTimeout(() => {
              router.back()
            }, 1500)
            return
          }
          // 从 YAML 中解析字段
          const parsedNameEn = yamlLabels.app || '' // 英文名从 labels.app 获取
          const parsedVersion = yamlLabels.version || '' // 版本从 labels.version 获取
          const parsedResourceName = yamlMetadata.name || '' // 资源名称从 metadata.name 获取
          const parsedDesc =
            yamlAnnotations.description || yamlAnnotations['ikubeops.com/description'] || ''
          const parsedNameCn = yamlAnnotations['ikubeops.com/project-name'] || '' // 尝试从注解获取中文名

          console.log('📝 从 YAML 解析的元数据:', {
            nameEn: parsedNameEn,
            version: parsedVersion,
            resourceName: parsedResourceName,
            nameCn: parsedNameCn,
            desc: parsedDesc
          })

          // 先取消选中容器
          containersStore.selectContainer(null)

          // 切换到第一步
          currentStep.value = 0

          // 等待组件卸载完成
          await nextTick()

          // 更新 namespace
          if (parsedDeployment.metadata) {
            parsedDeployment.metadata.namespace = currentNamespace.value
          }

          // 加载 YAML 到 stores（容器、存储卷等）
          const { updateStoresFromDeployment } = await import('@/store/workload')
          updateStoresFromDeployment(parsedDeployment)

          if (parsedDeployment.spec) {
            deploymentStore.loadFromK8s(parsedDeployment.spec)
          }

          // ：使用从 YAML 解析的数据更新元数据
          metadataStore.updateMetadata({
            nameCn: parsedNameCn, // 中文名（可能为空，需要用户填写）
            nameEn: parsedNameEn, // 英文名
            version: parsedVersion, // 版本
            resourceName: yamlResourceName,
            desc: parsedDesc // 描述
          })
          // 手动标记
          metadataStore.setResourceName(yamlResourceName)
          // 设置命名空间
          metadataStore.setNamespace(currentNamespace.value)

          console.log('metadataStore:', JSON.stringify(metadataStore.metadata))

          // 强制刷新组件
          componentKey.value++

          // 等待渲染完成
          await nextTick()
          await nextTick()

          // 验证所有步骤
          await validateAllStepsAfterYamlImport()

          // 根据中文名是否为空给出不同提示
          if (!parsedNameCn) {
            ElMessage.warning({
              message: '已从 YAML 同步数据，请补充填写中文名',
              duration: 4000,
              showClose: true
            })
          } else {
            ElMessage.success('已从 YAML 同步数据')
          }
        } catch (error) {
          console.error('解析YAML失败:', error)
          ElMessage.error({
            message: `YAML 格式错误：${error instanceof Error ? error.message : '未知错误'}`,
            duration: 5000,
            showClose: true
          })
          editMode.value = 'yaml'
        }
      }
    }
  })

  // ==================== 生命周期 ====================

  // 组件挂载时
  onMounted(async () => {
    const params = validateRouteParams(route.query)
    if (!params) {
      setTimeout(() => {
        router.back()
      }, 1500)
      return
    }

    routeParams.value = params

    // 第一步：初始化基础元数据
    const success = await initWorkloadByMode(params)

    if (!success) {
      setTimeout(() => {
        router.back()
      }, 1500)
      return
    }

    // 第二步：如果是编辑或复制模式，加载完整的 YAML 配置
    if (
      (params.mode === 'editAppVersion' || params.mode === 'copyAppVersion') &&
      params.applicationVersionId
    ) {
      try {
        // 保存当前的元数据（避免被 YAML 覆盖）
        const savedMetadata = {
          nameCn: metadataStore.metadata.nameCn,
          nameEn: metadataStore.metadata.nameEn,
          version: metadataStore.metadata.version,
          resourceName: metadataStore.metadata.resourceName,
          desc: metadataStore.metadata.desc
        }

        const { loadWorkloadYamlForEdit } = await import('../common/utils/modeHandler')
        const yamlStr = await loadWorkloadYamlForEdit(params.applicationVersionId)

        if (!yamlStr) {
          throw new Error('YAML 配置为空')
        }

        const documents = yaml.loadAll(yamlStr)
        if (documents.length === 0) {
          throw new Error('YAML 内容为空')
        }

        const parsedDeployment = documents[0] as any

        if (!parsedDeployment || parsedDeployment.kind !== 'Deployment') {
          throw new Error(`期望 Deployment 类型，但得到: ${parsedDeployment?.kind || '未知'}`)
        }

        if (parsedDeployment.metadata) {
          parsedDeployment.metadata.namespace = params.namespace
        }

        const { updateStoresFromDeployment } = await import('@/store/workload')
        updateStoresFromDeployment(parsedDeployment)

        if (parsedDeployment.spec) {
          deploymentStore.loadFromK8s(parsedDeployment.spec)
        }
        const yamlResourceName = parsedDeployment.metadata?.name || ''

        metadataStore.updateMetadata({
          nameCn: savedMetadata.nameCn,
          nameEn: savedMetadata.nameEn,
          version: savedMetadata.version,
          resourceName: yamlResourceName,
          desc: savedMetadata.desc
        })

        // 强制刷新组件
        componentKey.value++

        // 等待响应式更新
        await nextTick()
        await nextTick()

        //  终极修复：手动设置步骤验证状态
        const currentSteps = [...steps.value]

        // 步骤1：元数据配置（手动验证）
        const metadataValid =
          savedMetadata.nameCn &&
          savedMetadata.nameEn &&
          savedMetadata.version &&
          savedMetadata.resourceName
        applyStepState(currentSteps, 'metadata', {
          validated: metadataValid,
          hasError: !metadataValid,
          touched: true
        })

        // 步骤2：副本配置（手动验证）
        const replicasValid = deploymentStore.replicas > 0
        applyStepState(currentSteps, 'replicas', {
          validated: replicasValid,
          hasError: !replicasValid,
          touched: true
        })

        // 步骤3：存储（非必填）
        applyStepState(currentSteps, 'volumes', { validated: true, hasError: false, touched: true })

        // 步骤4：容器配置（手动验证）
        const containersResult = containersStore.validate()
        applyStepState(currentSteps, 'containers', {
          validated: containersResult.valid,
          hasError: !containersResult.valid,
          touched: true
        })

        // 其余非必填步骤默认通过
        ;['scheduling', 'advanced', 'review'].forEach((id) => {
          applyStepState(currentSteps, id, { validated: true, hasError: false, touched: true })
        })

        // 更新步骤状态
        steps.value = currentSteps

        ElMessage.success('配置加载完成')
      } catch (error) {
        ElMessage.error({
          message: `加载配置失败：${error instanceof Error ? error.message : '未知错误'}`,
          duration: 5000,
          showClose: true
        })
      }
    }

    hasUnsavedChanges.value = false
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  // 组件卸载时清理
  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })
</script>

<style lang="scss" scoped>
  .deployment-create-wizard {
    .wizard-content-card {
      min-height: 420px;

      ::v-deep(.el-card__body) {
        padding: 14px;
      }

      .step-enter-active,
      .step-leave-active {
        transition: all 0.3s ease;
      }

      .step-enter-from {
        opacity: 0;
        transform: translateX(20px);
      }

      .step-leave-to {
        opacity: 0;
        transform: translateX(-20px);
      }
    }
  }
</style>
