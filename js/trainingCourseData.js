// Training Course Data
// Extracted from training.jsx — bilingual quiz questions & Australian Standards

const TRAINING_COURSES = [
    {
      id: 'manual-handling',
      title: 'Manual Handling / 人工搬运',
      description: 'Learn safe lifting techniques and prevent workplace injuries / 学习安全搬运技术，预防工伤',
      duration: '15 min',
      image: '🏋️',
      standards: [
        { code: 'Safe Work Australia - Hazardous Manual Tasks COP 2018', url: 'https://www.safeworkaustralia.gov.au/doc/model-code-practice-hazardous-manual-tasks' },
        { code: 'AS/NZS 4422:1996 - Manual Handling', url: 'https://www.standards.org.au/' }
      ],
      questions: [
        {
          question: 'What is the recommended maximum weight for one person to lift without assistance? / 建议一人搬运的最大重量是多少？',
          options: ['10kg / 10公斤', '16kg / 16公斤', '25kg / 25公斤', '35kg / 35公斤'],
          correct: 2,
          explanation: 'Safe Work Australia recommends a maximum of 25kg for most workers in ideal conditions. / 澳大利亚安全工作局建议在理想条件下，大多数工人最多搬运25公斤。'
        },
        {
          question: 'Before lifting a heavy object, you should: / 搬运重物前，你应该：',
          options: ['Lift quickly to get it over with / 快速搬起来完成任务', 'Assess the load and plan your lift / 评估负载并计划搬运', 'Always use your back muscles / 总是用背部肌肉', 'Hold your breath / 屏住呼吸'],
          correct: 1,
          explanation: 'Always assess the load, check the path, and plan your lift before moving any object. / 在搬运任何物品前，始终评估负载、检查路径并计划搬运。'
        },
        {
          question: 'When lifting, you should bend at your: / 搬运时，你应该弯曲：',
          options: ['Back / 背部', 'Waist / 腰部', 'Knees and hips / 膝盖和臀部', 'Shoulders / 肩膀'],
          correct: 2,
          explanation: 'Bending at the knees and hips keeps your back straight and uses your stronger leg muscles. / 弯曲膝盖和臀部可以保持背部挺直，并使用更强壮的腿部肌肉。'
        },
        {
          question: 'How close should you hold a load to your body when carrying? / 搬运时应该把负载靠身体多近？',
          options: ['At arm\'s length / 手臂长度', 'As close as possible / 尽可能靠近', 'It doesn\'t matter / 无所谓', 'About 30cm away / 约30厘米远'],
          correct: 1,
          explanation: 'Holding loads close to your body reduces strain on your back and gives you better control. / 将负载靠近身体可以减少背部压力，并给你更好的控制。'
        },
        {
          question: 'If a load is too heavy, you should: / 如果负载太重，你应该：',
          options: ['Try harder / 更加努力', 'Use a team lift or mechanical aid / 使用团队搬运或机械辅助', 'Drag it instead / 改为拖拽', 'Lift in stages / 分阶段搬运'],
          correct: 1,
          explanation: 'Always use team lifting or mechanical aids like trolleys for loads that are too heavy. / 对于过重的负载，始终使用团队搬运或手推车等机械辅助工具。'
        },
        {
          question: 'What is the best foot position when lifting? / 搬运时最佳的脚部姿势是什么？',
          options: ['Feet together / 双脚并拢', 'Feet shoulder-width apart, one slightly forward / 双脚与肩同宽，一脚稍向前', 'Standing on tiptoes / 踮脚站立', 'Legs crossed / 双腿交叉'],
          correct: 1,
          explanation: 'A stable base with feet shoulder-width apart and one foot slightly forward provides the best balance. / 双脚与肩同宽、一脚稍向前的稳定姿势提供最佳平衡。'
        },
        {
          question: 'Twisting while carrying a load is dangerous because: / 搬运时扭转身体很危险，因为：',
          options: ['It makes you dizzy / 会让你头晕', 'It puts excessive strain on your spine / 会对脊柱造成过度压力', 'It\'s not dangerous / 不危险', 'It wastes time / 浪费时间'],
          correct: 1,
          explanation: 'Twisting under load can cause serious spinal injuries. Move your feet to turn instead. / 负重扭转可能导致严重的脊柱损伤。应该移动脚步来转向。'
        },
        {
          question: 'What should you do if you experience back pain after lifting? / 如果搬运后背部疼痛，你应该怎么做？',
          options: ['Ignore it and continue working / 忽略并继续工作', 'Report it and seek first aid / 报告并寻求急救', 'Take painkillers and keep working / 吃止痛药继续工作', 'Wait until after your shift / 等到下班后'],
          correct: 1,
          explanation: 'Always report injuries immediately. Early treatment prevents more serious damage. / 始终立即报告受伤。早期治疗可以防止更严重的损伤。'
        }
      ]
    },
    {
      id: 'working-at-heights',
      title: 'Working at Heights / 高空作业',
      description: 'Safety procedures for elevated work areas / 高空作业区域的安全程序',
      duration: '20 min',
      image: '🪜',
      standards: [
        { code: 'Safe Work Australia - Managing Falls COP 2022', url: 'https://www.safeworkaustralia.gov.au/doc/model-code-practice-managing-risk-falls-workplaces' },
        { code: 'AS/NZS 1891.4 - Industrial Fall Arrest Systems', url: 'https://www.standards.org.au/' },
        { code: 'AS/NZS 1892.1 - Portable Ladders', url: 'https://www.standards.org.au/' }
      ],
      questions: [
        {
          question: 'At what height does work become "working at heights" in Australia? / 在澳大利亚，多高算"高空作业"？',
          options: ['1 metre / 1米', '2 metres / 2米', '3 metres / 3米', 'Any height where you could be injured by a fall / 任何可能因跌落受伤的高度'],
          correct: 3,
          explanation: 'Working at heights is any work where a person could fall and be injured, regardless of the height. / 高空作业是指任何可能跌落并受伤的工作，无论高度如何。'
        },
        {
          question: 'What is the hierarchy of control for fall prevention? / 预防跌落的控制层级是什么？',
          options: ['PPE first, then eliminate / 先用PPE，再消除', 'Eliminate, substitute, isolate, admin controls, PPE / 消除、替代、隔离、管理控制、PPE', 'Admin controls only / 仅管理控制', 'Just use harnesses / 只用安全带'],
          correct: 1,
          explanation: 'Always try to eliminate the risk first, then substitute, isolate, use admin controls, and finally PPE as last resort. / 始终先尝试消除风险，然后替代、隔离、使用管理控制，最后将PPE作为最后手段。'
        },
        {
          question: 'Before using a ladder, you should: / 使用梯子前，你应该：',
          options: ['Just climb up quickly / 快速爬上去', 'Inspect it for damage and ensure it\'s the right type / 检查是否损坏并确保类型正确', 'Only check if it looks old / 只有看起来旧才检查', 'Ladders don\'t need inspection / 梯子不需要检查'],
          correct: 1,
          explanation: 'Always inspect ladders for damage, check the rating, and ensure it\'s suitable for the task. / 始终检查梯子是否损坏，检查额定值，并确保适合该任务。'
        },
        {
          question: 'What is the correct angle for a ladder against a wall? / 梯子靠墙的正确角度是多少？',
          options: ['Straight up (90 degrees) / 垂直（90度）', '1:4 ratio (75 degrees) / 1:4比例（75度）', 'As steep as possible / 尽可能陡', 'Lying almost flat / 几乎平放'],
          correct: 1,
          explanation: 'The 1:4 ratio (for every 4m up, 1m out at base) provides the safest angle. / 1:4比例（每上升4米，底部外移1米）提供最安全的角度。'
        },
        {
          question: 'When must you use a harness and lanyard? / 什么时候必须使用安全带和系绳？',
          options: ['Only if you feel scared / 只有感到害怕时', 'When there\'s no edge protection and you could fall 2m+ / 当没有边缘保护且可能跌落2米以上时', 'Harnesses are optional / 安全带是可选的', 'Only on roofs / 只在屋顶上'],
          correct: 1,
          explanation: 'Fall arrest systems are required when other controls cannot adequately protect against falls. / 当其他控制措施无法充分保护防止跌落时，需要使用防坠落系统。'
        }
      ]
    },
    {
      id: 'ppe',
      title: 'Personal Protective Equipment / 个人防护装备',
      description: 'Proper selection and use of PPE / 正确选择和使用PPE',
      duration: '10 min',
      image: '🦺',
      standards: [
        { code: 'AS/NZS 1337.1 - Eye & Face Protectors', url: 'https://www.standards.org.au/' },
        { code: 'AS/NZS 2210.3 - Safety Footwear', url: 'https://www.standards.org.au/' },
        { code: 'AS/NZS 1801 - Occupational Helmets', url: 'https://www.standards.org.au/' },
        { code: 'AS/NZS 4602.1 - High Visibility Clothing', url: 'https://www.standards.org.au/' }
      ],
      questions: [
        {
          question: 'PPE should be used: / PPE应该用于：',
          options: ['As the first line of defence / 作为第一道防线', 'Only when convenient / 只在方便时', 'As a last resort after other controls / 作为其他控制措施后的最后手段', 'Only for dangerous jobs / 只用于危险工作'],
          correct: 2,
          explanation: 'PPE is the last line of defence in the hierarchy of controls, not the first. / PPE是控制层级中的最后一道防线，而非第一道。'
        },
        {
          question: 'Hard hats should be replaced: / 安全帽应该在何时更换：',
          options: ['Never, they last forever / 永远不用，它们永久耐用', 'Only if cracked / 只有破裂时', 'After any significant impact or as per manufacturer guidelines / 任何重大撞击后或按制造商指南', 'Every 10 years / 每10年'],
          correct: 2,
          explanation: 'Hard hats must be replaced after any impact, if damaged, or as specified by the manufacturer (usually 2-5 years). / 安全帽必须在任何撞击后、损坏时或按制造商规定（通常2-5年）更换。'
        },
        {
          question: 'Safety glasses should: / 安全眼镜应该：',
          options: ['Fit loosely for comfort / 松松地戴着舒服', 'Fit snugly and have side protection / 紧贴并有侧面保护', 'Be worn only sometimes / 只偶尔戴', 'Only be clear lenses / 只用透明镜片'],
          correct: 1,
          explanation: 'Safety glasses must fit properly and provide adequate coverage including side protection. / 安全眼镜必须正确佩戴，并提供包括侧面保护在内的足够覆盖。'
        },
        {
          question: 'Who is responsible for maintaining PPE? / 谁负责维护PPE？',
          options: ['Only the employer / 只有雇主', 'Only the worker / 只有工人', 'Both employer and worker have responsibilities / 雇主和工人都有责任', 'No one / 没有人'],
          correct: 2,
          explanation: 'Employers must provide and maintain PPE, while workers must use it properly and report damage. / 雇主必须提供和维护PPE，而工人必须正确使用并报告损坏。'
        },
        {
          question: 'What class of safety boots is required for construction? / 建筑工地需要什么类型的安全靴？',
          options: ['Any comfortable shoes / 任何舒适的鞋子', 'Steel cap boots meeting AS/NZS 2210.3 / 符合AS/NZS 2210.3的钢头靴', 'Rubber boots only / 只用橡胶靴', 'Sneakers with good grip / 防滑运动鞋'],
          correct: 1,
          explanation: 'Construction sites typically require safety footwear meeting Australian Standards with toe protection. / 建筑工地通常需要符合澳大利亚标准并有脚趾保护的安全鞋。'
        }
      ]
    },
    {
      id: 'hazard-identification',
      title: 'Hazard Identification / 危害识别',
      description: 'Identifying and reporting workplace hazards / 识别和报告工作场所危害',
      duration: '15 min',
      image: '⚠️',
      standards: [
        { code: 'Safe Work Australia - Risk Management COP 2022', url: 'https://www.safeworkaustralia.gov.au/doc/model-code-practice-how-manage-work-health-and-safety-risks' },
        { code: 'AS/NZS ISO 31000 - Risk Management', url: 'https://www.standards.org.au/' },
        { code: 'WHS Act 2011 - Duty of Care', url: 'https://www.safeworkaustralia.gov.au/law-and-regulation/model-whs-laws' }
      ],
      questions: [
        {
          question: 'A hazard is: / 危害是：',
          options: ['An accident that happened / 已发生的事故', 'Something that could cause harm / 可能造成伤害的东西', 'A type of PPE / 一种PPE', 'A safety meeting / 安全会议'],
          correct: 1,
          explanation: 'A hazard is anything with the potential to cause harm, injury, or illness. / 危害是任何可能造成伤害、受伤或疾病的事物。'
        },
        {
          question: 'Who is responsible for identifying hazards? / 谁负责识别危害？',
          options: ['Only supervisors / 只有主管', 'Only safety officers / 只有安全员', 'Everyone on site / 现场每个人', 'Only management / 只有管理层'],
          correct: 2,
          explanation: 'Everyone has a responsibility to identify and report hazards in their workplace. / 每个人都有责任识别和报告工作场所的危害。'
        },
        {
          question: 'When you identify a hazard, you should: / 当你识别到危害时，你应该：',
          options: ['Ignore it if it\'s not your area / 如果不是你的区域就忽略', 'Report it immediately to your supervisor / 立即向主管报告', 'Wait until the safety meeting / 等到安全会议', 'Only report serious hazards / 只报告严重危害'],
          correct: 1,
          explanation: 'All hazards should be reported immediately so they can be assessed and controlled. / 所有危害都应立即报告，以便进行评估和控制。'
        },
        {
          question: 'A risk assessment considers: / 风险评估考虑：',
          options: ['Only the likelihood of harm / 只考虑伤害的可能性', 'Only the severity of harm / 只考虑伤害的严重程度', 'Both likelihood and severity of harm / 同时考虑伤害的可能性和严重程度', 'Only financial impact / 只考虑财务影响'],
          correct: 2,
          explanation: 'Risk is assessed by considering both how likely harm is to occur and how severe it would be. / 风险是通过考虑伤害发生的可能性和严重程度来评估的。'
        },
        {
          question: 'JSA stands for: / JSA代表：',
          options: ['Job Safety Analysis / 工作安全分析', 'Just Safety Awareness / 仅安全意识', 'Joint Safety Agreement / 联合安全协议', 'Job Start Approval / 工作开始批准'],
          correct: 0,
          explanation: 'A Job Safety Analysis breaks down tasks to identify hazards and controls for each step. / 工作安全分析分解任务以识别每个步骤的危害和控制措施。'
        }
      ]
    },
    {
      id: 'hot-works',
      title: 'Hot Works Safety / 热工作业安全',
      description: 'Welding, grinding & oxy cutting - Australian Standards compliant / 焊接、打磨和氧气切割 - 符合澳大利亚标准',
      duration: '25 min',
      image: '🔥',
      standards: [
        { code: 'AS 1674.1 - Safety in Welding (Fire Precautions)', url: 'https://www.standards.org.au/' },
        { code: 'AS/NZS 1338.1 - Welding Helmets', url: 'https://www.standards.org.au/' },
        { code: 'AS/NZS 1337.1 - Eye & Face Protectors', url: 'https://www.standards.org.au/' },
        { code: 'AS 4839-2001 - Oxy-Fuel Gas Systems', url: 'https://www.standards.org.au/' },
        { code: 'AS 4332-2004 - Gas Cylinder Storage', url: 'https://www.standards.org.au/' }
      ],
      questions: [
        {
          question: 'Under AS 1674.1, a Hot Work Permit is required when: / 根据AS 1674.1，何时需要热工作许可证：',
          options: ['Only for indoor welding / 仅室内焊接', 'Any work that produces flames, sparks or heat / 任何产生火焰、火花或热量的工作', 'Only when working near flammables / 仅在易燃物附近工作时', 'Only for certified welders / 仅持证焊工'],
          correct: 1,
          explanation: 'AS 1674.1 requires a Hot Work Permit for any work producing flames, sparks, or heat that could ignite nearby materials. / AS 1674.1要求任何产生火焰、火花或可能点燃附近材料的热量的工作都需要热工作许可证。'
        },
        {
          question: 'According to AS/NZS 1338.1, auto-darkening welding helmets must have a minimum shade of: / 根据AS/NZS 1338.1，自动变光焊接头盔必须具有最低遮光度：',
          options: ['Shade 5 / 5号', 'Shade 8 / 8号', 'Shade 10 / 10号', 'Shade 14 / 14号'],
          correct: 2,
          explanation: 'AS/NZS 1338.1 specifies welding helmets must have minimum shade 10 for arc welding to protect against UV and infrared radiation. / AS/NZS 1338.1规定电弧焊接头盔必须至少有10号遮光度，以保护免受紫外线和红外辐射。'
        },
        {
          question: 'When grinding steel, what eye protection standard applies? / 打磨钢材时，适用什么眼部保护标准？',
          options: ['AS/NZS 1337.1 - High Impact Rated / AS/NZS 1337.1 - 高冲击等级', 'AS 1674.1', 'AS 4839-2001', 'No specific standard applies / 没有特定标准适用'],
          correct: 0,
          explanation: 'AS/NZS 1337.1 requires high-impact rated safety glasses or face shields for grinding to protect against flying particles. / AS/NZS 1337.1要求打磨时使用高冲击等级的安全眼镜或面罩，以保护免受飞溅颗粒伤害。'
        },
        {
          question: 'AS 4839-2001 requires flashback arrestors on oxy-acetylene equipment at: / AS 4839-2001要求氧乙炔设备上的回火防止器安装在：',
          options: ['Only the torch / 仅在焊枪', 'Only the regulators / 仅在调节器', 'Both torch and regulator ends / 焊枪和调节器两端', 'They are optional / 它们是可选的'],
          correct: 2,
          explanation: 'AS 4839-2001 mandates flashback arrestors at BOTH the torch handle AND the regulator to prevent flashback explosions. / AS 4839-2001规定焊枪手柄和调节器两端都必须安装回火防止器，以防止回火爆炸。'
        },
        {
          question: 'The maximum working pressure for acetylene is: / 乙炔的最大工作压力是：',
          options: ['5 psi / 5 psi', '10 psi / 10 psi', '15 psi / 15 psi', '25 psi / 25 psi'],
          correct: 2,
          explanation: 'Acetylene becomes unstable above 15 psi (103 kPa) and can spontaneously decompose. Never exceed this limit. / 乙炔在超过15 psi（103 kPa）时变得不稳定，可能自发分解。切勿超过此限制。'
        },
        {
          question: 'Under AS 4332-2004, the minimum separation between oxygen and fuel gas cylinders in storage is: / 根据AS 4332-2004，储存时氧气和燃气钢瓶之间的最小间隔是：',
          options: ['1 metre / 1米', '2 metres / 2米', '3 metres / 3米', '5 metres / 5米'],
          correct: 2,
          explanation: 'AS 4332-2004 requires a minimum 3-metre separation between oxygen and fuel gas cylinders, or a fire-resistant barrier. / AS 4332-2004要求氧气和燃气钢瓶之间至少间隔3米，或设置防火屏障。'
        },
        {
          question: 'Before starting hot work, the area must be cleared of combustibles for a radius of: / 开始热工作业前，必须清除可燃物的半径为：',
          options: ['3 metres / 3米', '6 metres / 6米', '10 metres / 10米', '15 metres / 15米'],
          correct: 2,
          explanation: 'A minimum 10-metre radius should be cleared of combustible materials, or they must be protected with fire-resistant covers. / 应清除至少10米半径内的可燃材料，或用防火覆盖物保护它们。'
        },
        {
          question: 'A fire watch must remain at the hot work area after work completion for: / 热工作业完成后，防火监护人必须在工作区域停留：',
          options: ['15 minutes / 15分钟', '30 minutes / 30分钟', '60 minutes / 60分钟', '2 hours / 2小时'],
          correct: 1,
          explanation: 'Fire watch must continue for at least 30 minutes after hot work completion to detect any smouldering materials. / 热工作业完成后，防火监护必须持续至少30分钟，以检测任何阴燃材料。'
        },
        {
          question: 'When welding galvanized steel, you must: / 焊接镀锌钢时，你必须：',
          options: ['Weld faster to reduce fumes / 快速焊接以减少烟雾', 'Use respiratory protection and ensure ventilation / 使用呼吸保护装置并确保通风', 'Only weld outdoors / 只在室外焊接', 'Apply anti-spatter spray / 使用防飞溅喷剂'],
          correct: 1,
          explanation: 'Welding galvanized steel releases zinc oxide fumes. Use appropriate respiratory protection (P2 minimum) and ensure adequate ventilation. / 焊接镀锌钢会释放氧化锌烟雾。使用适当的呼吸保护装置（至少P2级别）并确保充分通风。'
        },
        {
          question: 'The correct way to open a gas cylinder valve is: / 打开气瓶阀门的正确方法是：',
          options: ['Fully open quickly / 快速完全打开', 'Open slowly, stand to the side / 缓慢打开，站在侧面', 'Open halfway only / 只打开一半', 'Open with the regulator attached first / 先连接调节器再打开'],
          correct: 1,
          explanation: 'Always stand to the side and open cylinder valves slowly to prevent sudden pressure surges and allow for controlled gas flow. / 始终站在侧面缓慢打开钢瓶阀门，以防止突然的压力激增并允许受控的气体流动。'
        },
        {
          question: 'If an angle grinder disc is cracked or chipped, you should: / 如果角磨机砂轮片破裂或缺损，你应该：',
          options: ['Use it carefully at lower speed / 低速小心使用', 'Mark it and continue for the current job / 标记后继续当前工作', 'Remove and destroy it immediately / 立即取下并销毁', 'Apply tape to reinforce it / 用胶带加固'],
          correct: 2,
          explanation: 'Damaged discs can shatter at high speed causing serious injury. Remove and destroy any cracked or chipped discs immediately. / 损坏的砂轮片可能在高速下破碎造成严重伤害。立即取下并销毁任何破裂或缺损的砂轮片。'
        },
        {
          question: 'The correct PPE for hot works includes: / 热工作业的正确PPE包括：',
          options: ['Safety glasses only / 仅安全眼镜', 'Gloves and long sleeves / 手套和长袖', 'Welding helmet, leather gloves, fire-resistant clothing, safety boots / 焊接头盔、皮手套、防火服装、安全靴', 'Hard hat and hi-vis / 安全帽和反光服'],
          correct: 2,
          explanation: 'Full PPE includes: appropriate eye protection, leather welding gloves, fire-resistant clothing, leather apron, and steel-capped boots. / 完整的PPE包括：适当的眼部保护、皮革焊接手套、防火服装、皮革围裙和钢头靴。'
        },
        {
          question: 'When oxy-cutting, the flame should be adjusted to: / 氧气切割时，火焰应调节为：',
          options: ['A large orange flame / 大的橙色火焰', 'A neutral flame with equal cone / 等比例锥形的中性火焰', 'Maximum oxygen for speed / 最大氧气以提高速度', 'Minimum flame to save gas / 最小火焰以节省气体'],
          correct: 1,
          explanation: 'A neutral flame (equal acetylene and oxygen) provides the cleanest cut. Adjust until the inner cone is clearly defined. / 中性火焰（乙炔和氧气相等）提供最干净的切割。调节直到内锥清晰可见。'
        },
        {
          question: 'Gas cylinders must be stored: / 气瓶必须储存：',
          options: ['Lying flat for stability / 平放以保持稳定', 'Upright and secured with chains or straps / 直立并用链条或绑带固定', 'In direct sunlight for visibility / 在阳光直射下以便可见', 'Near emergency exits for quick access / 在紧急出口附近以便快速取用'],
          correct: 1,
          explanation: 'Cylinders must be stored upright and secured to prevent falling. Keep away from heat sources and direct sunlight. / 气瓶必须直立存放并固定以防倾倒。远离热源和阳光直射。'
        },
        {
          question: 'The 2025 Australian WHS exposure standard for aluminium welding fumes is: / 2025年澳大利亚WHS铝焊接烟雾暴露标准是：',
          options: ['1 mg/m³', '2 mg/m³', '5 mg/m³', '10 mg/m³'],
          correct: 0,
          explanation: 'The workplace exposure standard for welding fumes (including aluminium) is 1 mg/m³ TWA, requiring adequate ventilation or RPE. / 焊接烟雾（包括铝）的工作场所暴露标准是1 mg/m³ TWA，需要充分通风或使用呼吸防护设备。'
        },
        {
          question: 'If a flashback occurs during oxy-acetylene work, the FIRST action is: / 如果氧乙炔作业中发生回火，第一步是：',
          options: ['Turn off the torch valves / 关闭焊枪阀门', 'Turn off the cylinder valves immediately / 立即关闭钢瓶阀门', 'Run water over the hoses / 用水冲洗软管', 'Call emergency services / 呼叫紧急服务'],
          correct: 1,
          explanation: 'In a flashback, immediately close the cylinder valves (oxygen first, then fuel). The flashback arrestors should prevent flame reaching cylinders. / 发生回火时，立即关闭钢瓶阀门（先关氧气，再关燃气）。回火防止器应防止火焰到达钢瓶。'
        }
      ]
    },
    {
      id: 'glass-suction-cups',
      title: 'Glass Suction Cups / 玻璃吸盘',
      description: 'Safe use of manual glass suction cups and suckers / 手动玻璃吸盘的安全使用',
      duration: '10 min',
      image: '🪟',
      standards: [
        { code: 'Safe Work Australia - Hazardous Manual Tasks COP', url: 'https://www.safeworkaustralia.gov.au/doc/model-code-practice-hazardous-manual-tasks' },
        { code: 'AS 4991 - Lifting Equipment for Glass', url: 'https://www.standards.org.au/' },
        { code: 'Manufacturer Guidelines - Trojan Tools', url: 'https://www.trojantools.com.au/' }
      ],
      questions: [
        {
          question: 'Before using a suction cup, what should you always do first? / 使用吸盘前，你应该首先做什么？',
          options: ['Just start using it / 直接开始使用', 'Inspect for wear, cracks or damage / 检查磨损、裂缝或损坏', 'Wet it with water / 用水弄湿', 'Heat it up / 加热'],
          correct: 1,
          explanation: 'Before each use, check the suction cup for any signs of wear, cracks, or damage. Ensure the rubber pad is clean. / 每次使用前，检查吸盘是否有磨损、裂缝或损坏的迹象。确保橡胶垫清洁。'
        },
        {
          question: 'The glass surface should be: / 玻璃表面应该是：',
          options: ['Wet and oily / 潮湿和油腻的', 'Clean, dry and free from dust / 清洁、干燥且无灰尘', 'Warm to the touch / 摸起来温热', 'Rough textured / 粗糙纹理的'],
          correct: 1,
          explanation: 'A clean, dry surface free from dust, oil or contaminants ensures a better seal and reduces slippage risk. / 清洁、干燥、无灰尘、油脂或污染物的表面可确保更好的密封并降低滑脱风险。'
        },
        {
          question: 'After applying the suction cup, what should you do before lifting? / 安装吸盘后，提起前应该做什么？',
          options: ['Immediately lift the glass / 立即提起玻璃', 'Test the seal with a gentle tug / 轻轻拉动测试密封', 'Twist it back and forth / 来回扭动', 'Wait 10 minutes / 等待10分钟'],
          correct: 1,
          explanation: 'Gently tug on the suction cup to ensure it has a secure grip. If loose, repeat the application process. / 轻轻拉动吸盘以确保其牢固抓紧。如果松动，请重复安装过程。'
        },
        {
          question: 'What is the static load rating for a Trojan Double Cup Suction Holder? / Trojan双杯吸盘的静态负载额定值是多少？',
          options: ['20kg / 20公斤', '40kg / 40公斤', '60kg / 60公斤', '100kg / 100公斤'],
          correct: 2,
          explanation: 'The Trojan Double Cup Suction Holder has a static load rating of 60kg for safe handling of materials. / Trojan双杯吸盘的静态负载额定值为60公斤，可安全搬运材料。'
        },
        {
          question: 'How should you clean the suction cup rubber pad after use? / 使用后如何清洁吸盘橡胶垫？',
          options: ['With harsh chemicals / 用强力化学品', 'With mild detergent and water / 用温和洗涤剂和水', 'With abrasive materials / 用研磨材料', 'No cleaning needed / 不需要清洁'],
          correct: 1,
          explanation: 'Clean with mild detergent and water. Avoid harsh chemicals or abrasives that could damage the rubber. / 用温和洗涤剂和水清洁。避免使用可能损坏橡胶的强力化学品或研磨材料。'
        },
        {
          question: 'Where should suction cups be stored? / 吸盘应该存放在哪里？',
          options: ['In direct sunlight / 阳光直射处', 'In a cool, dry place away from sunlight / 阴凉干燥、避免阳光直射的地方', 'In water / 水中', 'Outside in the weather / 户外暴露在天气中'],
          correct: 1,
          explanation: 'Store in a cool, dry place away from direct sunlight. Heat and UV rays can degrade the rubber material. / 存放在阴凉干燥、避免阳光直射的地方。高温和紫外线会降解橡胶材料。'
        },
        {
          question: 'When moving materials with suction cups, you should: / 使用吸盘移动材料时，你应该：',
          options: ['Move quickly to get it done / 快速移动以完成任务', 'Move slowly and smoothly with safe lifting techniques / 使用安全搬运技术缓慢平稳移动', 'Swing the material around / 摆动材料', 'Drag it across surfaces / 在表面上拖拽'],
          correct: 1,
          explanation: 'Handle materials slowly and smoothly, using safe lifting techniques to avoid injury or damage. / 缓慢平稳地搬运材料，使用安全搬运技术以避免受伤或损坏。'
        },
        {
          question: 'When should you replace a suction cup? / 何时应该更换吸盘？',
          options: ['Only when it completely fails / 只有完全失效时', 'When you notice cracks, deformations or loss of suction / 当你发现裂缝、变形或吸力下降时', 'Every week / 每周', 'Never, they last forever / 永远不用，它们永久耐用'],
          correct: 1,
          explanation: 'Replace immediately if you notice any cracks, deformations, or loss of suction capability. / 如果发现任何裂缝、变形或吸力下降，请立即更换。'
        }
      ]
    }
  ];
