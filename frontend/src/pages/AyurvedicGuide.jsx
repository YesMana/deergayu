import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Sun, Coffee, Droplet, Moon, Activity, Info, BookOpen, Clock } from 'lucide-react';
import './AyurvedicGuide.css';

const fadeUpVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const herbalRemedies = [
  {
    id: 1,
    name: 'Paspanguwa (පස්පංගුව)',
    image: 'https://images.unsplash.com/photo-1596541223130-5d564415f0d4?auto=format&fit=crop&q=80&w=400',
    ingredients: ['Coriander', 'Ginger', 'Pathpadagam', 'Katuwelbatu', 'Veniwelgeta'],
    uses: 'Common cold, fever, body aches, and boosting immunity.',
    preparation: 'Boil all 5 ingredients in 4 cups of water until it reduces to 1 cup. Drink warm, optionally with jaggery.'
  },
  {
    id: 2,
    name: 'Koththamalli (කොත්තමල්ලි)',
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=400',
    ingredients: ['Coriander seeds', 'Ginger (optional)'],
    uses: 'Mild fever, sore throat, indigestion, and as a cooling drink.',
    preparation: 'Roast coriander seeds lightly, crush them, and boil with water. Strain and drink warm.'
  },
  {
    id: 3,
    name: 'Veniwelgeta (වෙනිවැල්ගැට)',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400',
    ingredients: ['Yellow Vine (Coscinium fenestratum)'],
    uses: 'Pain relief, reducing inflammation, wound healing, and treating tetanus.',
    preparation: 'Boil the dried stems in water for 15-20 minutes. Drink the bitter decoction.'
  },
  {
    id: 4,
    name: 'Iramusu (ඉරමුසු)',
    image: 'https://images.unsplash.com/photo-1589363460779-cb495392ee5a?auto=format&fit=crop&q=80&w=400',
    ingredients: ['Indian Sarsaparilla (Hemidesmus indicus)'],
    uses: 'Purifying blood, cooling the body, improving skin complexion, and treating urinary tract infections.',
    preparation: 'Boil the dried roots in water and drink as a regular tea.'
  },
  {
    id: 5,
    name: 'Gotukola Kenda (ගොටුකොළ කැඳ)',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400',
    ingredients: ['Gotukola leaves', 'Red rice', 'Coconut milk', 'Garlic', 'Ginger'],
    uses: 'Enhancing memory, improving eyesight, and nourishing the body.',
    preparation: 'Blend Gotukola leaves with water, extract the juice, and cook with pre-boiled red rice gruel and coconut milk.'
  },
  {
    id: 6,
    name: 'Karapincha (කරපිංචා)',
    image: 'https://images.unsplash.com/photo-1596541223130-5d564415f0d4?auto=format&fit=crop&q=80&w=400',
    ingredients: ['Curry leaves'],
    uses: 'Lowering cholesterol, improving digestion, and controlling diabetes.',
    preparation: 'Extract juice from fresh leaves and mix with a little lime and salt, or consume as a gruel (kenda).'
  }
];

const dailyRoutine = [
  {
    time: '5:00 AM - 6:00 AM',
    title: 'Brahma Muhurta (Wake Up)',
    icon: <Sun size={24} />,
    description: 'Wake up 1.5 hours before sunrise. This is the most peaceful time of day, dominated by Vata dosha, ideal for spiritual practices and instilling a sense of peace for the day.',
    tips: ['Gently stretch in bed', 'Express gratitude', 'Avoid checking your phone immediately']
  },
  {
    time: '6:00 AM - 6:30 AM',
    title: 'Purification & Cleansing',
    icon: <Droplet size={24} />,
    description: 'Cleanse the senses. Wash your face, splash cold water on your eyes, and scrape your tongue to remove Ama (toxins). Drink a glass of warm water to stimulate digestion.',
    tips: ['Use a copper tongue scraper', 'Drink warm lemon water', 'Brush teeth with herbal toothpaste']
  },
  {
    time: '6:30 AM - 7:30 AM',
    title: 'Movement & Meditation',
    icon: <Activity size={24} />,
    description: 'Engage in gentle exercise like Yoga, followed by Pranayama (breathwork) and meditation to ground your energy.',
    tips: ['Sun salutations (Surya Namaskar)', '10-15 minutes of silent meditation', 'Abhyanga (self-massage with warm oil) before bathing']
  },
  {
    time: '7:30 AM - 8:30 AM',
    title: 'Light Breakfast',
    icon: <Coffee size={24} />,
    description: 'Eat a nourishing, warm breakfast appropriate for your Dosha. Digestion is just waking up, so keep it easily digestible.',
    tips: ['Warm oatmeal or Kenda (herbal gruel)', 'Avoid cold or heavy foods', 'Eat only when genuinely hungry']
  },
  {
    time: '12:00 PM - 1:00 PM',
    title: 'Lunch (Main Meal)',
    icon: <Sun size={24} color="#ff9800" />,
    description: 'Pitta dosha is at its peak, meaning your Agni (digestive fire) is strongest. This should be your largest and most complex meal of the day.',
    tips: ['Include all 6 tastes (sweet, sour, salty, bitter, pungent, astringent)', 'Eat in a calm environment', 'Sit for 10 minutes after eating']
  },
  {
    time: '6:00 PM - 7:00 PM',
    title: 'Light Dinner',
    icon: <Moon size={24} color="#5c6bc0" />,
    description: 'As the sun goes down, your digestive fire weakens. Eat a light, warm dinner at least 2-3 hours before going to bed.',
    tips: ['Soups, steamed vegetables, or light grains', 'Avoid heavy proteins or cold dairy', 'Take a short, gentle walk after eating']
  },
  {
    time: '9:30 PM - 10:00 PM',
    title: 'Rest & Sleep',
    icon: <Moon size={24} />,
    description: 'Wind down your day. Kapha dosha is prominent now, bringing a natural heaviness that promotes deep, restorative sleep.',
    tips: ['Drink warm milk with nutmeg or turmeric', 'Read a calming book', 'Ensure the room is dark and cool']
  }
];

const AyurvedicGuide = () => {
  const [activeTab, setActiveTab] = useState('remedies');

  return (
    <div className="ayurvedic-guide-page page-transition">
      <div className="guide-hero">
        <motion.div 
          className="container"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.h1 variants={fadeUpVariant} className="text-gradient">Ayurvedic Wellness Guide</motion.h1>
          <motion.p variants={fadeUpVariant} className="lead-text">
            Discover the ancient wisdom of Sri Lankan traditional medicine and daily routines to balance your mind, body, and spirit.
          </motion.p>
        </motion.div>
      </div>

      <div className="container">
        <div className="tabs-container">
          <div className="tabs-header glass-panel">
            <button 
              className={`tab-btn ${activeTab === 'remedies' ? 'active' : ''}`}
              onClick={() => setActiveTab('remedies')}
            >
              <Leaf size={20} />
              Herbal Remedies (අත් බෙහෙත්)
            </button>
            <button 
              className={`tab-btn ${activeTab === 'routine' ? 'active' : ''}`}
              onClick={() => setActiveTab('routine')}
            >
              <Clock size={20} />
              Daily Routine (දිනචරියාව)
            </button>
          </div>

          <div className="tab-content">
            <AnimatePresence mode="wait">
              {activeTab === 'remedies' && (
                <motion.div
                  key="remedies"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="section-header">
                    <h2>Traditional Sri Lankan Remedies</h2>
                    <p>Time-tested natural solutions for common ailments.</p>
                  </div>
                  
                  <div className="remedies-grid">
                    {herbalRemedies.map((remedy) => (
                      <motion.div key={remedy.id} className="remedy-card glass-panel glass-panel-hover" variants={fadeUpVariant} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                        <div className="remedy-image" style={{ backgroundImage: `url(${remedy.image})` }}>
                          <div className="remedy-badge">Traditional</div>
                        </div>
                        <div className="remedy-content">
                          <h3>{remedy.name}</h3>
                          
                          <div className="remedy-info-group">
                            <h4><Leaf size={16} /> Ingredients</h4>
                            <p>{remedy.ingredients.join(', ')}</p>
                          </div>
                          
                          <div className="remedy-info-group">
                            <h4><Activity size={16} /> Best For</h4>
                            <p>{remedy.uses}</p>
                          </div>
                          
                          <div className="remedy-info-group highlight">
                            <h4><BookOpen size={16} /> Preparation</h4>
                            <p>{remedy.preparation}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'routine' && (
                <motion.div
                  key="routine"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="section-header">
                    <h2>Dinacharya: The Daily Routine</h2>
                    <p>Align your day with nature's rhythms for optimal health and vitality.</p>
                  </div>
                  
                  <div className="routine-timeline">
                    {dailyRoutine.map((step, index) => (
                      <motion.div 
                        key={index} 
                        className="timeline-item"
                        variants={fadeUpVariant} 
                        initial="hidden" 
                        whileInView="visible" 
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="timeline-marker">
                          <div className="timeline-icon glass-panel">{step.icon}</div>
                          {index !== dailyRoutine.length - 1 && <div className="timeline-line"></div>}
                        </div>
                        <div className="timeline-content glass-panel glass-panel-hover">
                          <div className="timeline-time">{step.time}</div>
                          <h3>{step.title}</h3>
                          <p>{step.description}</p>
                          
                          <div className="timeline-tips">
                            <h4><Info size={14} /> Quick Tips</h4>
                            <ul>
                              {step.tips.map((tip, i) => (
                                <li key={i}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AyurvedicGuide;
