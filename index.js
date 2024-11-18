const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const config = require('./config.json');

// تعريف الـ ID المصرح لهم فقط بتشغيل البوت
const authorizedUserId = '1216455331421618320'; // ضع هنا الـ ID الخاص بك

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// التعامل مع رسالة "!ticket" من الشخص المصرح له فقط
client.on('messageCreate', async (message) => {
    if (message.content === '!ticket' && message.author.id === authorizedUserId) {
        // إعداد القائمة المنسدلة لاختيار القسم
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_category')
            .setPlaceholder('اختار القسم الذي ترغب فيه')
            .addOptions([
                {
                    label: 'استفسارات عامة',
                    value: 'general_inquiries',
                    description: 'الاستفسار عن أمور عامة',
                    emoji: '📌',
                },
                {
                    label: 'شكاوي ديسكورد',
                    value: 'discord_complaints',
                    description: 'شكاوى تتعلق بـ Discord',
                    emoji: '💬',
                },
                {
                    label: 'شكاوي شبكة',
                    value: 'network_complaints',
                    description: 'شكاوى تتعلق بالشبكة',
                    emoji: '🌐',
                },
                {
                    label: 'شكاوي فاكشنات',
                    value: 'faction_complaints',
                    description: 'شكاوى تتعلق بالفريق/الفاكشنات',
                    emoji: '⚔️',
                },
                {
                    label: 'شكاوي إدارية',
                    value: 'admin_complaints',
                    description: 'شكاوى تتعلق بالإدارة',
                    emoji: '📝',
                },
            ]);

        // إعداد الصف الخاص بالقائمة المنسدلة
        const row = new ActionRowBuilder().addComponents(selectMenu);

        // إرسال رسالة Embed مع صورة وأدوات اختيار
        const embed = new EmbedBuilder()
            .setColor(0x808080) // اللون الرمادي
            .setTitle('📌 **بإنشاء التذكرة**')
            .setDescription('اضغط على الزر الذي في الأسفل واختر القسم المناسب من ثم سوف يتم إنشاء قناة جديدة قم بشرح الشكوى كاملة داخل القناة وانتظر رد فريق الدعم.')
            .setImage('https://k.top4top.io/p_3244ga5vy1.jpg') // ضع هنا رابط الصورة التي تريدها قبل الضغط
            .setFooter({ text: 'تذكرة دعم' });

        // إرسال الرسالة دون منشن
        await message.reply({ embeds: [embed], components: [row], allowedMentions: { parse: [] } });
    } else if (message.content === '!ticket' && message.author.id !== authorizedUserId) {
        // إذا حاول شخص غير مخول استخدام الأمر
        await message.reply('ليس لديك الصلاحية لاستخدام هذا الأمر.');
    }
});

// التعامل مع التفاعل مع القائمة المنسدلة
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isSelectMenu()) return;

    let categoryId;
    let ticketName;

    try {
        switch (interaction.values[0]) {
            case 'general_inquiries':
                categoryId = config.categories.generalInquiries;
                ticketName = 'استفسار عام';
                break;
            case 'discord_complaints':
                categoryId = config.categories.discordComplaints;
                ticketName = 'شكاوي ديسكورد';
                break;
            case 'network_complaints':
                categoryId = config.categories.networkComplaints;
                ticketName = 'شكاوي شبكة';
                break;
            case 'faction_complaints':
                categoryId = config.categories.factionComplaints;
                ticketName = 'شكاوي فاكشنات';
                break;
            case 'admin_complaints':
                categoryId = config.categories.adminComplaints;
                ticketName = 'شكاوي إدارية';
                break;
            default:
                return interaction.reply('اختيار غير صالح');
        }

        // تحقق من وجود الفئة
        const category = interaction.guild.channels.cache.get(categoryId);
        if (!category) {
            console.error(`الفئة غير موجودة: ${categoryId}`);
            return interaction.reply('الفئة غير موجودة!');
        }

        // محاولة إنشاء القناة المخصصة للتذكرة
        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: 0, // نوع القناة: نصية
            parent: category.id,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: ['ViewChannel'],
                },
                {
                    id: config.supportRoleId, // رول الدعم
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
                },
                {
                    id: interaction.user.id,
                    allow: ['ViewChannel', 'SendMessages'],
                },
            ],
        });

        // إعداد الأزرار للتحكم بالتذكرة
        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('استلام التذكرة')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('قفل التذكرة')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('delete_ticket')
                .setLabel('حذف التذكرة')
                .setStyle(ButtonStyle.Danger)
        );

        // إرسال رسالة Embed في القناة الجديدة مع صورة
        const ticketEmbed = new EmbedBuilder()
            .setColor(0x808080) // اللون الرمادي
            .setTitle('مرحباً بك!')
            .setDescription(`مرحباً ${interaction.user.tag}!\nتم فتح تذكرتك بنجاح في قسم ${ticketName}. \n\nالرجاء شرح مشكلتك في هذه القناة، وانتظار فريق الدعم للرد عليك.`)
            .setFooter({ text: 'تذكرة دعم' });

        await ticketChannel.send({ embeds: [ticketEmbed], components: [buttonRow] });
        await interaction.reply({ content: 'تم فتح تذكرتك بنجاح!', ephemeral: true });
    } catch (error) {
        console.error('Error creating ticket channel:', error);
        interaction.reply({ content: 'حدث خطأ أثناء فتح التذكرة، يرجى المحاولة لاحقًا.', ephemeral: true });
    }
});

// التعامل مع الأزرار
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const ticketChannel = interaction.channel;

    if (interaction.customId === 'claim_ticket') {
        // استلام التذكرة من قبل فريق الدعم
        await ticketChannel.send(`تم استلام التذكرة من قبل: ${interaction.user.tag}`);
        await interaction.reply({ content: 'تم استلام التذكرة.', ephemeral: true });
    } else if (interaction.customId === 'close_ticket') {
        // قفل التذكرة
        await ticketChannel.send('تم قفل التذكرة. شكرًا لتعاونك.');
        await ticketChannel.permissionOverwrites.edit(ticketChannel.guild.id, { ViewChannel: false });
        await interaction.reply({ content: 'تم قفل التذكرة.', ephemeral: true });
    } else if (interaction.customId === 'delete_ticket') {
        // حذف التذكرة
        await ticketChannel.send('تم حذف التذكرة.');
        await ticketChannel.delete();
        await interaction.reply({ content: 'تم حذف التذكرة.', ephemeral: true });
    }
});

// تسجيل دخول البوت باستخدام التوكن
client.login(config.token);
