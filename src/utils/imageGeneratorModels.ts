import configuredModels
from "../config/imageGeneratorModels.json";

export type ImageModelDownload = {
  url: string;
  destinationDirectory: string;
  fileName?: string;
};

export type ImageGeneratorModelLicense = {
  name: string;
  url: string;
  summary: string;
  usage: string;
  restrictions: string[];
};

export type ImageGeneratorWorkflowTemplate =
  | "checkpoint"
  | "flux2"
  | "sd3TripleClip"
  | "stableCascade"
  | "unetClipVae"
  | "unetDualClipVae";

export type ImageGeneratorWorkflowSettings = {
  batchSize?: number;
  cascadeCompression?: number;
  cfg?: number;
  checkpointName?: string;
  clipName?: string;
  clipName1?: string;
  clipName2?: string;
  clipGName?: string;
  clipLName?: string;
  clipType?: string;
  denoise?: number;
  device?: string;
  diffusionModelName?: string;
  filenamePrefix?: string;
  flux2SchedulerHeight?: number;
  flux2SchedulerWidth?: number;
  guidance?: number;
  height?: number;
  latentNodeClass?: string;
  modelSamplingClass?: string;
  modelSamplingShift?: number;
  negativePrompt?: string;
  promptPrefix?: string;
  promptSuffix?: string;
  samplerName?: string;
  scheduler?: string;
  seed?: number;
  stageBCheckpointName?: string;
  stageBCfg?: number;
  stageBSamplerName?: string;
  stageBScheduler?: string;
  stageBSeed?: number;
  stageBSteps?: number;
  stageCCheckpointName?: string;
  steps?: number;
  t5Name?: string;
  tokenizerMinLength?: number;
  tokenizerMinPadding?: number;
  useT5TokenizerOptions?: boolean;
  vaeName?: string;
  weightDtype?: string;
  width?: number;
};

export type ImageGeneratorModel = {
  name: string;
  description: string;
  architecture?: string;
  notes?: string[];
  recommendedMemory?: string;
  tags?: string[];
  license: ImageGeneratorModelLicense;
  workflowPath?: string;
  workflowTemplate?: ImageGeneratorWorkflowTemplate;
  workflow?: ImageGeneratorWorkflowSettings;
  promptAttributeName?: string;
  promptAttributeNames?: string[];
  downloads: ImageModelDownload[];
};

const workflowModules =
  import.meta.glob("../config/workflows/*.json", {
    eager: true,
    import: "default"
  }) as Record<string, unknown>;

export const imageGeneratorModels =
  configuredModels as ImageGeneratorModel[];

function cloneJson(value: unknown) {

  return JSON.parse(JSON.stringify(value)) as unknown;
}

function normalizeWorkflowPath(path: string) {

  return path
    .replace(/^\.?\//, "")
    .replace(/^src\/config\//, "")
    .replace(/^config\//, "");
}

function getWorkflowModule(workflowPath: string) {

  const normalizedPath =
    normalizeWorkflowPath(workflowPath);
  const workflowEntry =
    Object.entries(workflowModules)
      .find(([path]) => path.endsWith(`/${normalizedPath}`));

  return workflowEntry === undefined
    ? undefined
    : workflowEntry[1];
}

function isRecord(value: unknown): value is Record<string, unknown> {

  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstDownloadFileName(model: ImageGeneratorModel) {

  return model.downloads
    .map((download) => download.fileName)
    .find((fileName): fileName is string => fileName !== undefined);
}

function firstDownloadFileNameIn(
  model: ImageGeneratorModel,
  destinationDirectory: string
) {

  return model.downloads
    .filter((download) => download.destinationDirectory === destinationDirectory)
    .map((download) => download.fileName)
    .find((fileName): fileName is string => fileName !== undefined);
}

function requiredWorkflowValue(
  value: string | undefined,
  label: string,
  model: ImageGeneratorModel
) {

  if (value === undefined || value.trim() === "") {
    throw new Error(`${label} introuvable pour le modèle ${model.name}`);
  }

  return value;
}

function buildOptionalModelSamplingNode(
  modelNodeId: string,
  settings: ImageGeneratorWorkflowSettings
) {

  if (settings.modelSamplingClass === undefined) {
    return undefined;
  }

  return {
    class_type: settings.modelSamplingClass,
    inputs: {
      model: [
        modelNodeId,
        0
      ],
      shift: settings.modelSamplingShift ?? 3
    }
  };
}

function formatPrompt(
  model: ImageGeneratorModel,
  prompt: string
) {

  const workflowSettings =
    model.workflow ?? {};

  return [
    workflowSettings.promptPrefix ?? "",
    prompt,
    workflowSettings.promptSuffix ?? ""
  ].join("");
}

function checkpointWorkflow(
  model: ImageGeneratorModel,
  settings: ImageGeneratorWorkflowSettings
) {

  const checkpointName =
    requiredWorkflowValue(
      settings.checkpointName ?? firstDownloadFileName(model),
      "Checkpoint",
      model
    );

  const latentNodeClass =
    settings.latentNodeClass ?? "EmptyLatentImage";
  const modelNodeId =
    settings.modelSamplingClass === undefined ? "4" : "10";

  const workflow: Record<string, unknown> = {
    "3": {
      class_type: "KSampler",
      inputs: {
        cfg: settings.cfg ?? 7.5,
        denoise: settings.denoise ?? 1,
        latent_image: [
          "5",
          0
        ],
        model: [
          modelNodeId,
          0
        ],
        negative: [
          "7",
          0
        ],
        positive: [
          "6",
          0
        ],
        sampler_name: settings.samplerName ?? "euler",
        scheduler: settings.scheduler ?? "normal",
        seed: settings.seed ?? 156680208700286,
        steps: settings.steps ?? 28
      }
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        ckpt_name: checkpointName
      }
    },
    "5": {
      class_type: latentNodeClass,
      inputs: {
        batch_size: settings.batchSize ?? 1,
        height: settings.height ?? 1024,
        width: settings.width ?? 1024
      }
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: {
        clip: [
          "4",
          1
        ],
        text: "A detailed cinematic image"
      }
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: {
        clip: [
          "4",
          1
        ],
        text: settings.negativePrompt ?? "blurry, low quality, distorted"
      }
    },
    "8": {
      class_type: "VAEDecode",
      inputs: {
        samples: [
          "3",
          0
        ],
        vae: [
          "4",
          2
        ]
      }
    },
    "9": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: settings.filenamePrefix ?? "assistia",
        images: [
          "8",
          0
        ]
      }
    }
  };

  const modelSamplingNode =
    buildOptionalModelSamplingNode("4", settings);

  if (modelSamplingNode !== undefined) {
    workflow["10"] =
      modelSamplingNode;
  }

  return workflow;
}

function sd3TripleClipWorkflow(
  model: ImageGeneratorModel,
  settings: ImageGeneratorWorkflowSettings
) {

  const checkpointName =
    requiredWorkflowValue(
      settings.checkpointName ?? firstDownloadFileName(model),
      "Checkpoint",
      model
    );
  const clipLName =
    requiredWorkflowValue(settings.clipLName, "Encodeur CLIP-L", model);
  const clipGName =
    requiredWorkflowValue(settings.clipGName, "Encodeur CLIP-G", model);
  const t5Name =
    requiredWorkflowValue(settings.t5Name, "Encodeur T5", model);

  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        cfg: settings.cfg ?? 5.45,
        denoise: settings.denoise ?? 1,
        latent_image: [
          "5",
          0
        ],
        model: [
          "4",
          0
        ],
        negative: [
          "7",
          0
        ],
        positive: [
          "6",
          0
        ],
        sampler_name: settings.samplerName ?? "euler",
        scheduler: settings.scheduler ?? "sgm_uniform",
        seed: settings.seed ?? 156680208700286,
        steps: settings.steps ?? 30
      }
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        ckpt_name: checkpointName
      }
    },
    "5": {
      class_type: "EmptySD3LatentImage",
      inputs: {
        batch_size: settings.batchSize ?? 1,
        height: settings.height ?? 1024,
        width: settings.width ?? 1024
      }
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: {
        clip: [
          "10",
          0
        ],
        text: "A detailed cinematic image"
      }
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: {
        clip: [
          "10",
          0
        ],
        text: settings.negativePrompt ?? ""
      }
    },
    "8": {
      class_type: "VAEDecode",
      inputs: {
        samples: [
          "3",
          0
        ],
        vae: [
          "4",
          2
        ]
      }
    },
    "9": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: settings.filenamePrefix ?? "assistia-sd3",
        images: [
          "8",
          0
        ]
      }
    },
    "10": {
      class_type: "TripleCLIPLoader",
      inputs: {
        clip_name1: clipLName,
        clip_name2: clipGName,
        clip_name3: t5Name
      }
    }
  };
}

function unetClipVaeWorkflow(
  model: ImageGeneratorModel,
  settings: ImageGeneratorWorkflowSettings
) {

  const diffusionModelName =
    requiredWorkflowValue(
      settings.diffusionModelName ?? firstDownloadFileNameIn(model, "diffusion_models"),
      "Modele de diffusion",
      model
    );
  const clipName =
    requiredWorkflowValue(
      settings.clipName ?? firstDownloadFileNameIn(model, "text_encoders"),
      "Encodeur texte",
      model
    );
  const vaeName =
    requiredWorkflowValue(
      settings.vaeName ?? firstDownloadFileNameIn(model, "vae"),
      "VAE",
      model
    );

  const clipNodeId =
    settings.useT5TokenizerOptions === true ? "11" : "10";
  const modelNodeId =
    settings.modelSamplingClass === undefined ? "4" : "12";

  const workflow: Record<string, unknown> = {
    "3": {
      class_type: "KSampler",
      inputs: {
        cfg: settings.cfg ?? 4,
        denoise: settings.denoise ?? 1,
        latent_image: [
          "5",
          0
        ],
        model: [
          modelNodeId,
          0
        ],
        negative: [
          "7",
          0
        ],
        positive: [
          "6",
          0
        ],
        sampler_name: settings.samplerName ?? "euler",
        scheduler: settings.scheduler ?? "simple",
        seed: settings.seed ?? 156680208700286,
        steps: settings.steps ?? 30
      }
    },
    "4": {
      class_type: "UNETLoader",
      inputs: {
        unet_name: diffusionModelName,
        weight_dtype: settings.weightDtype ?? "default"
      }
    },
    "5": {
      class_type: settings.latentNodeClass ?? "EmptySD3LatentImage",
      inputs: {
        batch_size: settings.batchSize ?? 1,
        height: settings.height ?? 1024,
        width: settings.width ?? 1024
      }
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: {
        clip: [
          clipNodeId,
          0
        ],
        text: "A detailed cinematic image"
      }
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: {
        clip: [
          clipNodeId,
          0
        ],
        text: settings.negativePrompt ?? ""
      }
    },
    "8": {
      class_type: "VAEDecode",
      inputs: {
        samples: [
          "3",
          0
        ],
        vae: [
          "9",
          0
        ]
      }
    },
    "9": {
      class_type: "VAELoader",
      inputs: {
        vae_name: vaeName
      }
    },
    "10": {
      class_type: "CLIPLoader",
      inputs: {
        clip_name: clipName,
        device: settings.device ?? "default",
        type: requiredWorkflowValue(settings.clipType, "Type d'encodeur texte", model)
      }
    },
    "13": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: settings.filenamePrefix ?? "assistia",
        images: [
          "8",
          0
        ]
      }
    }
  };

  if (settings.useT5TokenizerOptions === true) {
    workflow["11"] = {
      class_type: "T5TokenizerOptions",
      inputs: {
        clip: [
          "10",
          0
        ],
        min_length: settings.tokenizerMinLength ?? 3,
        min_padding: settings.tokenizerMinPadding ?? 0
      }
    };
  }

  const modelSamplingNode =
    buildOptionalModelSamplingNode("4", settings);

  if (modelSamplingNode !== undefined) {
    workflow["12"] =
      modelSamplingNode;
  }

  return workflow;
}

function unetDualClipVaeWorkflow(
  model: ImageGeneratorModel,
  settings: ImageGeneratorWorkflowSettings
) {

  const diffusionModelName =
    requiredWorkflowValue(
      settings.diffusionModelName ?? firstDownloadFileNameIn(model, "diffusion_models"),
      "Modele de diffusion",
      model
    );
  const clipName1 =
    requiredWorkflowValue(settings.clipName1, "Encodeur texte principal", model);
  const clipName2 =
    requiredWorkflowValue(settings.clipName2, "Encodeur texte secondaire", model);
  const vaeName =
    requiredWorkflowValue(
      settings.vaeName ?? firstDownloadFileNameIn(model, "vae"),
      "VAE",
      model
    );

  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        cfg: settings.cfg ?? 3.5,
        denoise: settings.denoise ?? 1,
        latent_image: [
          "5",
          0
        ],
        model: [
          "4",
          0
        ],
        negative: [
          "7",
          0
        ],
        positive: [
          "6",
          0
        ],
        sampler_name: settings.samplerName ?? "euler",
        scheduler: settings.scheduler ?? "simple",
        seed: settings.seed ?? 156680208700286,
        steps: settings.steps ?? 20
      }
    },
    "4": {
      class_type: "UNETLoader",
      inputs: {
        unet_name: diffusionModelName,
        weight_dtype: settings.weightDtype ?? "default"
      }
    },
    "5": {
      class_type: settings.latentNodeClass ?? "EmptySD3LatentImage",
      inputs: {
        batch_size: settings.batchSize ?? 1,
        height: settings.height ?? 1024,
        width: settings.width ?? 1024
      }
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: {
        clip: [
          "10",
          0
        ],
        text: "A detailed cinematic image"
      }
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: {
        clip: [
          "10",
          0
        ],
        text: settings.negativePrompt ?? ""
      }
    },
    "8": {
      class_type: "VAEDecode",
      inputs: {
        samples: [
          "3",
          0
        ],
        vae: [
          "9",
          0
        ]
      }
    },
    "9": {
      class_type: "VAELoader",
      inputs: {
        vae_name: vaeName
      }
    },
    "10": {
      class_type: "DualCLIPLoader",
      inputs: {
        clip_name1: clipName1,
        clip_name2: clipName2,
        device: settings.device ?? "default",
        type: requiredWorkflowValue(settings.clipType, "Type d'encodeur texte", model)
      }
    },
    "13": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: settings.filenamePrefix ?? "assistia",
        images: [
          "8",
          0
        ]
      }
    }
  };
}

function stableCascadeWorkflow(
  model: ImageGeneratorModel,
  settings: ImageGeneratorWorkflowSettings
) {

  const stageCCheckpointName =
    requiredWorkflowValue(settings.stageCCheckpointName, "Checkpoint Stable Cascade Stage C", model);
  const stageBCheckpointName =
    requiredWorkflowValue(settings.stageBCheckpointName, "Checkpoint Stable Cascade Stage B", model);

  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        cfg: settings.cfg ?? 4,
        denoise: settings.denoise ?? 1,
        latent_image: [
          "34",
          0
        ],
        model: [
          "41",
          0
        ],
        negative: [
          "7",
          0
        ],
        positive: [
          "6",
          0
        ],
        sampler_name: settings.samplerName ?? "euler_ancestral",
        scheduler: settings.scheduler ?? "simple",
        seed: settings.seed ?? 156680208700286,
        steps: settings.steps ?? 20
      }
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: {
        clip: [
          "41",
          1
        ],
        text: "A detailed cinematic image"
      }
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: {
        clip: [
          "41",
          1
        ],
        text: settings.negativePrompt ?? "text, watermark"
      }
    },
    "8": {
      class_type: "VAEDecode",
      inputs: {
        samples: [
          "33",
          0
        ],
        vae: [
          "42",
          2
        ]
      }
    },
    "9": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: settings.filenamePrefix ?? "assistia-stable-cascade",
        images: [
          "8",
          0
        ]
      }
    },
    "33": {
      class_type: "KSampler",
      inputs: {
        cfg: settings.stageBCfg ?? 1.1,
        denoise: settings.denoise ?? 1,
        latent_image: [
          "34",
          1
        ],
        model: [
          "42",
          0
        ],
        negative: [
          "7",
          0
        ],
        positive: [
          "36",
          0
        ],
        sampler_name: settings.stageBSamplerName ?? "euler_ancestral",
        scheduler: settings.stageBScheduler ?? "simple",
        seed: settings.stageBSeed ?? 156680208700286,
        steps: settings.stageBSteps ?? 10
      }
    },
    "34": {
      class_type: "StableCascade_EmptyLatentImage",
      inputs: {
        batch_size: settings.batchSize ?? 1,
        compression: settings.cascadeCompression ?? 42,
        height: settings.height ?? 1024,
        width: settings.width ?? 1024
      }
    },
    "36": {
      class_type: "StableCascade_StageB_Conditioning",
      inputs: {
        conditioning: [
          "6",
          0
        ],
        stage_c: [
          "3",
          0
        ]
      }
    },
    "41": {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        ckpt_name: stageCCheckpointName
      }
    },
    "42": {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        ckpt_name: stageBCheckpointName
      }
    }
  };
}

function flux2Workflow(
  model: ImageGeneratorModel,
  settings: ImageGeneratorWorkflowSettings
) {

  const diffusionModelName =
    requiredWorkflowValue(
      settings.diffusionModelName ?? firstDownloadFileNameIn(model, "diffusion_models"),
      "Modele Flux 2",
      model
    );
  const clipName =
    requiredWorkflowValue(
      settings.clipName ?? firstDownloadFileNameIn(model, "text_encoders"),
      "Encodeur Flux 2",
      model
    );
  const vaeName =
    requiredWorkflowValue(
      settings.vaeName ?? firstDownloadFileNameIn(model, "vae"),
      "VAE Flux 2",
      model
    );

  return {
    "6": {
      class_type: "CLIPTextEncode",
      inputs: {
        clip: [
          "38",
          0
        ],
        text: "A detailed cinematic image"
      }
    },
    "8": {
      class_type: "VAEDecode",
      inputs: {
        samples: [
          "13",
          0
        ],
        vae: [
          "10",
          0
        ]
      }
    },
    "9": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: settings.filenamePrefix ?? "assistia-flux2",
        images: [
          "8",
          0
        ]
      }
    },
    "10": {
      class_type: "VAELoader",
      inputs: {
        vae_name: vaeName
      }
    },
    "12": {
      class_type: "UNETLoader",
      inputs: {
        unet_name: diffusionModelName,
        weight_dtype: settings.weightDtype ?? "default"
      }
    },
    "13": {
      class_type: "SamplerCustomAdvanced",
      inputs: {
        guider: [
          "22",
          0
        ],
        latent_image: [
          "47",
          0
        ],
        noise: [
          "25",
          0
        ],
        sampler: [
          "16",
          0
        ],
        sigmas: [
          "48",
          0
        ]
      }
    },
    "16": {
      class_type: "KSamplerSelect",
      inputs: {
        sampler_name: settings.samplerName ?? "euler"
      }
    },
    "22": {
      class_type: "BasicGuider",
      inputs: {
        conditioning: [
          "26",
          0
        ],
        model: [
          "12",
          0
        ]
      }
    },
    "25": {
      class_type: "RandomNoise",
      inputs: {
        noise_seed: settings.seed ?? 156680208700286
      }
    },
    "26": {
      class_type: "FluxGuidance",
      inputs: {
        conditioning: [
          "6",
          0
        ],
        guidance: settings.guidance ?? 4
      }
    },
    "38": {
      class_type: "CLIPLoader",
      inputs: {
        clip_name: clipName,
        device: settings.device ?? "default",
        type: settings.clipType ?? "flux2"
      }
    },
    "47": {
      class_type: "EmptyFlux2LatentImage",
      inputs: {
        batch_size: settings.batchSize ?? 1,
        height: settings.height ?? 1024,
        width: settings.width ?? 1024
      }
    },
    "48": {
      class_type: "Flux2Scheduler",
      inputs: {
        height: settings.flux2SchedulerHeight ?? settings.height ?? 1024,
        steps: settings.steps ?? 20,
        width: settings.flux2SchedulerWidth ?? settings.width ?? 1024
      }
    }
  };
}

function buildWorkflowFromTemplate(model: ImageGeneratorModel) {

  const workflowTemplate =
    model.workflowTemplate ?? "checkpoint";
  const workflowSettings =
    model.workflow ?? {};

  switch (workflowTemplate) {
    case "checkpoint":
      return checkpointWorkflow(model, workflowSettings);
    case "flux2":
      return flux2Workflow(model, workflowSettings);
    case "sd3TripleClip":
      return sd3TripleClipWorkflow(model, workflowSettings);
    case "stableCascade":
      return stableCascadeWorkflow(model, workflowSettings);
    case "unetClipVae":
      return unetClipVaeWorkflow(model, workflowSettings);
    case "unetDualClipVae":
      return unetDualClipVaeWorkflow(model, workflowSettings);
    default:
      throw new Error(`Template workflow inconnu: ${workflowTemplate}`);
  }
}

function setValueAtPath(
  target: unknown,
  path: string[],
  prompt: string
) {

  let current =
    target;

  for (const segment of path.slice(0, -1)) {
    if (Array.isArray(current)) {
      const index =
        Number(segment);

      if (!Number.isInteger(index) || current[index] === undefined) {
        return false;
      }

      current =
        current[index];
    } else if (isRecord(current) && segment in current) {
      current =
        current[segment];
    } else {
      return false;
    }
  }

  const lastSegment =
    path[path.length - 1];

  if (Array.isArray(current)) {
    const index =
      Number(lastSegment);

    if (!Number.isInteger(index) || current[index] === undefined) {
      return false;
    }

    current[index] =
      prompt;

    return true;
  }

  if (isRecord(current) && lastSegment in current) {
    current[lastSegment] =
      prompt;

    return true;
  }

  return false;
}

function replaceAttributeValue(
  target: unknown,
  attributeName: string,
  prompt: string
): number {

  if (Array.isArray(target)) {
    return target.reduce(
      (count, item) => count + replaceAttributeValue(item, attributeName, prompt),
      0
    );
  }

  if (!isRecord(target)) {
    return 0;
  }

  return Object.entries(target).reduce((count, [key, value]) => {
    if (key === attributeName) {
      target[key] =
        prompt;

      return count + 1;
    }

    return count + replaceAttributeValue(value, attributeName, prompt);
  }, 0);
}

export function buildWorkflowForPrompt(
  model: ImageGeneratorModel,
  prompt: string
) {

  const workflow =
    model.workflowPath === undefined
      ? buildWorkflowFromTemplate(model)
      : cloneJson(
        getWorkflowModule(model.workflowPath)
          ?? (() => {
            throw new Error(`Workflow introuvable: ${model.workflowPath}`);
          })()
      );

  const promptAttributes =
    model.promptAttributeNames
      ?? [model.promptAttributeName ?? "6.inputs.text"];
  const formattedPrompt =
    formatPrompt(model, prompt);

  for (const promptAttributeValue of promptAttributes) {
    const promptAttribute =
      promptAttributeValue.trim();

    if (promptAttribute.includes(".")) {
      const didUpdate =
        setValueAtPath(workflow, promptAttribute.split("."), formattedPrompt);

      if (!didUpdate) {
        throw new Error(`Attribut prompt introuvable: ${promptAttribute}`);
      }

      continue;
    }

    const replacementCount =
      replaceAttributeValue(workflow, promptAttribute, formattedPrompt);

    if (replacementCount === 0) {
      throw new Error(`Attribut prompt introuvable: ${promptAttribute}`);
    }
  }

  return workflow;
}
