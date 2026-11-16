import { FileCheck2, PackageCheck, Scale, ShieldCheck, Ship } from "lucide-react";

// Separate preview data keeps the original three templates untouched.
export const motionProducts = [
  {code:"CGL", en:"PRODUCT LIABILITY", name:"产品责任险", scene:"让好产品，安心走向世界。", short:"为产品走向海外，提前准备责任保障。", description:"面向跨境电商经营中的产品责任风险，了解适用平台、保障范围及 COI 保险凭证要求。", icon:ShieldCheck, audience:"在海外电商平台销售商品的企业与卖家", points:["了解产品引发人身伤害或财产损失的责任保障","根据经营平台、销售地区和产品类别匹配方案","协助准备投保资料与保险凭证"], materials:"企业主体信息、经营平台、产品清单及实际销售情况。"},
  {code:"CARGO", en:"CARGO INSURANCE", name:"国际货运险", scene:"从货物启程，到下一站安心。", short:"从起运到交付，了解适合货物的保障。", description:"围绕跨境运输安排保障，按到港、到仓、上架或全程等不同业务需求了解方案。", icon:Ship, audience:"通过海运、空运、铁路等方式运输货物的企业", points:["按运输路线与货物情况了解承保条件","区分到港、到仓、上架与全程等保障终点","提前了解货损取证、报案与索赔资料"], materials:"货物品名与货值、运输方式、起运地与目的地、运输单据等。"},
  {code:"TRO", en:"IP LITIGATION", name:"TRO 侵权诉讼保险", scene:"面对未知风险，多一份准备。", short:"提前了解知识产权诉讼相关保障条件。", description:"了解非故意知识产权侵权引发 TRO 时，符合承保条件的费用与责任保障。", icon:Scale, audience:"关注海外知识产权诉讼风险的跨境电商卖家", points:["了解适用侵权类型、承保地区与责任限制","明确风控服务、投保条件和除外责任","提前熟悉通知、报案与法律服务对接流程"], materials:"投保主体、店铺与产品信息，以及渠道要求的风险核验资料。"},
  {code:"VIES", en:"ITALIAN GUARANTEE", name:"意大利 VIES 保函", scene:"新的市场，做好下一步准备。", short:"理清适用条件，协助保函资料与办理。", description:"根据企业实际情况了解 VIES 担保要求，协助准备保险保函申请与递交资料。", icon:FileCheck2, audience:"需要了解意大利 VIES 担保要求的跨境企业", points:["核实企业是否适用以及办理所需条件","协助整理申请、递交与后续跟进资料","说明保函的追偿责任及相关办理约定"], materials:"企业主体、税务代表、税号情况及渠道要求的申请资料。"},
  {code:"CREDIT", en:"TRADE CREDIT", name:"贸易信用险", scene:"把握每一次机会，也关注收款。", short:"围绕贸易模式，了解买方信用风险保障。", description:"围绕赊销贸易与买方信用风险，了解适合企业业务模式的信用保险服务。", icon:PackageCheck, audience:"存在赊销交易与买方信用风险的贸易企业", points:["了解买方信用风险与适用业务场景","根据交易结构了解额度与保障条件","沟通投保、风险管理和索赔资料要求"], materials:"企业与买方信息、贸易模式、账期及业务规模等。"},
] as const;

export type MotionProduct = typeof motionProducts[number];
