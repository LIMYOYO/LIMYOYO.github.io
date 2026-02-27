---
layout: archive
title: "CV"
permalink: /cv/
author_profile: true
redirect_from:
  - /resume
---

{% include base_path %}

[Download PDF](/files/cv_zeyulin.pdf)

---

## Education

**Shanghai Jiao Tong University (SJTU)** — Shanghai, China
*M.S. in Industrial Engineering* &nbsp;&nbsp; Sep 2023 – Jun 2026 (expected)
- Advisors: Prof. Yaoming Zhou, Prof. Tangbin Xia
- Relevant Courses: Advanced Operations Research (A), Optimization Method

**Shanghai Jiao Tong University (SJTU)** — Shanghai, China
*B.E. in Industrial Engineering* &nbsp;&nbsp; Sep 2019 – Jun 2023
- GPA: 3.7/4.3 &nbsp;(87/100, TOP 15/58)
- Relevant Courses: Service Management (A+), Logistics and Supply Chain (A+), Production Planning and Control (A), Stochastic Models (A), Probability and Statistics (A)

---

## Research Interests

Operations Research & Management · Network Competition (Cournot Games) · Resource Allocation · Shared Mobility · On-demand Platforms · Reinforcement Learning

---

## Research Experience

**Crowd-sourcing Operation in Rental Network Competition** &nbsp;&nbsp; Jun 2023 – Present
*Supervisors: Prof. Ying-Ju Chen (HKUST) and Prof. Yaoming Zhou (SJTU)*
- Built a Networked Cournot model to study competition under crowd-sourced labor in rental networks.
- Analyzed firm profits, labor surplus, and consumer surplus under firm, crowd, and dual sourcing via comparative statics.
- Paper currently **Reject & Resubmit (Invited)** in *Manufacturing & Service Operations Management*.

**Staff-Based Relocation and Swapping for E-Bike Sharing Systems** &nbsp;&nbsp; Sep 2021 – Nov 2023
*Supervisors: Prof. Jiuh-Biing Sheu (NTU) and Prof. Yaoming Zhou (SJTU)*
- Developed a unified optimization model integrating e-bike relocation and battery swapping.
- Modeled e-bike and battery station dynamics with a Markov chain; proposed an adaptive one-step Markovian strategy and a rolling-horizon strategy achieving >20% profit improvement over industrial baselines.
- Published in *Transportation Research Part B: Methodological* (30+ citations).

**User-Based Relocation for E-Bike Sharing Systems** &nbsp;&nbsp; Sep 2023 – May 2025
*Supervisor: Prof. Yaoming Zhou (SJTU)*
- Developed a user-incentive mechanism with power-level recommendations to complement staff-based relocation.
- Formulated a multi-battery-state Markov model and devised a variable neighborhood search algorithm; profit gains of up to 12.6% on real-world data.
- Published in *IEEE Transactions on Intelligent Transportation Systems*; one paper submitted to *Transportation Research Part B: Methodological*.

**E-Bike Allocation Optimization in Competitive Markets** &nbsp;&nbsp; Sep 2023 – Present
*Supervisor: Prof. Yaoming Zhou (SJTU); Industry Partner: HelloBike (Shanghai)*
- Developed an RL-based allocation strategy in competitive e-bike sharing markets.
- Collected real-time competitor fleet distribution via Bluetooth sniffing; trained RL models to optimize firm fleet deployment.

**Proactive Dispatching for Semiconductor OHT Systems** &nbsp;&nbsp; Dec 2025 – Present
*Supervisor: Prof. Zuo-Jun (Max) Shen (The University of Hong Kong)*
- Collaborated with TCL to optimize OHT scheduling in semiconductor fabrication.
- Developed a proactive empty vehicle repositioning strategy to pre-deploy idle vehicles to future demand nodes, reducing system latency.

---

## Publications

[\*: Corresponding Author / Advisor]

<ul>{% for post in site.publications reversed %}
  {% include archive-single-cv.html %}
{% endfor %}</ul>

---

## Teaching

<ul>{% for post in site.teaching reversed %}
  {% include archive-single-cv.html %}
{% endfor %}</ul>

---

## Project Experience

**Project Leader, Optimization of Modular Transit System ('Magic Bus')** &nbsp;&nbsp; 2023 – 2024
*Selected as the Official Case Study for the Top-tier IEOR Competition in China*
- Pioneered a dynamic scheduling framework for a novel Modular Transit System, enabling modules to couple and decouple en route to adapt to real-time passenger demands.
- Developed a meta-heuristic algorithm for resource allocation and vehicle routing, balancing operational profit with passenger satisfaction.

---

## Honors & Awards

| Award | Year |
|---|---|
| Scholarship, School of Mechanical Engineering, SJTU | 2024 |
| First Prize, China Mechanical Engineering Innovation and Creativity Competition | 2023 |
| Scholarship, 'Chun-Tsung' Scientific Research Fund | 2021 |
| First Prize, China Industrial Engineering Application Case Competition | 2021 |
| Second Prize, Contemporary Undergraduate Mathematical Contest in Modeling (CUMCM) | 2021 |
| First Prize, 'Toyota Cup' National Industrial Engineering Innovation Competition | 2020 |

---

## Skills

- **Programming:** Python, MATLAB, Julia
- **Methods:** Markov Decision Processes, Integer Programming, Game Theory, Reinforcement Learning, Metaheuristics (VNS, etc.)
- **Tools:** Gurobi, CPLEX, LaTeX
