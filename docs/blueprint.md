# **App Name**: Restaurant Manager Suite

## Core Features:

- Secure User & Restaurant Onboarding: Frontend for restaurant and user registration with role assignment, enabling secure login and session management via JWTs from the backend API. It includes forms for new restaurants to register with complete legal and contact details, and for individual staff members to register with basic info, linked to specific access roles.
- Role-Based Dynamic Dashboard: Displays tailored daily operational overviews (checklists, production schedule, daily menus, work plans) dynamically based on the logged-in user's assigned role (Admin, Chefe, Apoio, Serviço). This ensures each user sees only relevant information and tasks.
- Inventory & Ingredient Management: Interface to add, view, update, and manage ingredient inventory. This includes fields for name, quantity, unit (supporting Brazilian units like kg, g, unit, fardo, caixa), and cost price, displaying real-time stock levels.
- Cost & Pricing Management Tool: A generative AI-powered tool to assist in defining recipe technical sheets by associating ingredients to dishes. It calculates the theoretical Cost of Goods Sold (CMV) for each dish and intelligently suggests menu item pricing by factoring in Brazilian taxes (e.g., Simples Nacional), card fees, and delivery app commissions to help achieve desired profit margins.
- Integrated Order & Sales System: Enables staff (Service role) to take customer orders, manage tables, and handle take-away orders efficiently. The system processes sales, automatically updates inventory based on technical sheets, and calculates profit per transaction in real-time.
- Operational Checklists System: Provides dedicated interfaces for 'Chefe' and 'Apoio' roles to access, view, and mark off daily operational checklists (e.g., opening, closing, MEP, cleaning). This creates a digital record for task completion and accountability.
- Profitability Reporting: Generates essential financial reports that summarize profitability. These reports will show the gross profit after accounting for CMV and various variable operational costs specific to Brazil, such as taxes and payment gateway fees.

## Style Guidelines:

- Primary color: A balanced and professional shade of green (#2D855A) chosen to evoke freshness and operational efficiency in a culinary context, suitable for headings and interactive elements.
- Background color: A very light, desaturated green (#EEF6F2) provides a clean, airy, and readable base for the management interface.
- Accent color: A brighter, pure green (#84DB84) used sparingly to highlight critical information or call-to-action buttons, creating visual emphasis.
- Body and headline font: 'Inter' (sans-serif) is chosen for its modern, neutral, and highly readable characteristics, making it ideal for displaying detailed data and structured information within a business management application.
- Utilize a consistent set of minimalist, outline-style icons. Icons should clearly represent management tasks, kitchen operations, financial concepts, and common user actions, maintaining clarity across all interface elements.
- Adopt a clean, grid-based, and responsive layout that prioritizes content organization and data readability on various screen sizes. Dashboards will feature cards for key metrics, and forms will have clear input labels and logical flow.
- Incorporate subtle and functional animations, such as smooth transitions for tab switching, concise loading indicators for data fetching, and gentle feedback for form submissions. These animations enhance user experience without causing distractions.