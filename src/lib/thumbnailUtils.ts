/**
 * Utility functions for generating topic-based, randomized, and stable
 * Unsplash thumbnail images for courses.
 */

export function getTopicRelatedThumbnail(title: string, courseId?: string): string {
  const cleanTitle = (title || "").toLowerCase();
  
  // Categorize based on keywords
  let category: "ai" | "web" | "coding" | "cloud" | "design" | "business" | "generic" = "generic";
  
  if (
    cleanTitle.includes("ai") || 
    cleanTitle.includes("artificial") || 
    cleanTitle.includes("intelligence") || 
    cleanTitle.includes("data science") || 
    cleanTitle.includes("ds") || 
    cleanTitle.includes("machine learning") || 
    cleanTitle.includes("deep learning") || 
    cleanTitle.includes("neural")
  ) {
    category = "ai";
  } else if (
    cleanTitle.includes("web") || 
    cleanTitle.includes("react") || 
    cleanTitle.includes("html") || 
    cleanTitle.includes("css") || 
    cleanTitle.includes("js") || 
    cleanTitle.includes("javascript") || 
    cleanTitle.includes("frontend") || 
    cleanTitle.includes("backend") || 
    cleanTitle.includes("fullstack") || 
    cleanTitle.includes("website")
  ) {
    category = "web";
  } else if (
    cleanTitle.includes("python") || 
    cleanTitle.includes("cpp") || 
    cleanTitle.includes("c++") || 
    cleanTitle.includes("java") || 
    cleanTitle.includes("coding") || 
    cleanTitle.includes("programming") || 
    cleanTitle.includes("mern") || 
    cleanTitle.includes("rust") || 
    cleanTitle.includes("go") || 
    cleanTitle.includes("swift")
  ) {
    category = "coding";
  } else if (
    cleanTitle.includes("cloud") || 
    cleanTitle.includes("aws") || 
    cleanTitle.includes("azure") || 
    cleanTitle.includes("docker") || 
    cleanTitle.includes("devops") || 
    cleanTitle.includes("kubernetes")
  ) {
    category = "cloud";
  } else if (
    cleanTitle.includes("design") || 
    cleanTitle.includes("ui") || 
    cleanTitle.includes("ux") || 
    cleanTitle.includes("figma") || 
    cleanTitle.includes("graphic") || 
    cleanTitle.includes("photoshop")
  ) {
    category = "design";
  } else if (
    cleanTitle.includes("business") || 
    cleanTitle.includes("marketing") || 
    cleanTitle.includes("finance") || 
    cleanTitle.includes("startup") || 
    cleanTitle.includes("management") || 
    cleanTitle.includes("corporate") || 
    cleanTitle.includes("xcelerator")
  ) {
    category = "business";
  }

  // List of curated Unsplash images for each category
  const images = {
    ai: [
      "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&q=80&w=500", // abstract ai
      "https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&q=80&w=500", // brain neural
      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=500", // robotic arm
      "https://images.unsplash.com/photo-1527474305487-b87b222841cc?auto=format&fit=crop&q=80&w=500"  // abstract coding grid
    ],
    web: [
      "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&q=80&w=500", // web design
      "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&q=80&w=500", // react code/screen
      "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=500", // wireframe website
      "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=500"  // web dev desk
    ],
    coding: [
      "https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&q=80&w=500", // matrix screen code
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=500", // python code
      "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=500", // code dark editor
      "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&q=80&w=500"  // keyboard programmer
    ],
    cloud: [
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=500", // network servers cloud
      "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=500", // server rack ethernet
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=500"  // cloud technology node
    ],
    design: [
      "https://images.unsplash.com/photo-1561070791-26c113006238?auto=format&fit=crop&q=80&w=500", // colorful design abstract
      "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?auto=format&fit=crop&q=80&w=500", // sketching design
      "https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?auto=format&fit=crop&q=80&w=500"  // UI elements screen
    ],
    business: [
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=500", // charts business analytics
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=500", // business sky building
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=500"  // team collaboration
    ],
    generic: [
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=500", // technology connection
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=500", // books library stack
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=500", // studying pencil paper
      "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&q=80&w=500"  // abstract modern workstation
    ]
  };

  const list = images[category] || images.generic;

  if (courseId) {
    let sum = 0;
    for (let i = 0; i < courseId.length; i++) {
      sum += courseId.charCodeAt(i);
    }
    const index = sum % list.length;
    return list[index];
  }

  const randIndex = Math.floor(Math.random() * list.length);
  return list[randIndex];
}
